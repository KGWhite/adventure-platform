import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CredentialType } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { EventsService } from './../src/events/events.service.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { staffAuthHeader } from './helpers/staff-auth.js';

// Requires a migrated and seeded database at DATABASE_URL. The suite resets
// Aria (cred-demo-001) before each test, so never point it at real data.
describe('Shop + Equipment (e2e)', () => {
  let app: INestApplication<App>;
  let staff: Record<string, string>;
  let prisma: PrismaService;
  let events: EventsService;
  let ariaId: string;

  const ARIA = 'cred-demo-001';
  const DISABLED = 'cred-e2e-disabled';

  const scan = () =>
    request(app.getHttpServer())
      .post('/api/v1/shops/shop-01/scan')
      .set(staff)
      .send({ credentialValue: ARIA });

  const buy = (itemId: string, extra: Record<string, unknown> = {}) =>
    request(app.getHttpServer())
      .post('/api/v1/shops/shop-01/purchases')
      .set(staff)
      .send({ credentialValue: ARIA, itemId, requestId: randomUUID(), ...extra });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    staff = await staffAuthHeader(app);
    prisma = app.get(PrismaService);
    events = app.get(EventsService);

    const credential = await prisma.credential.findUniqueOrThrow({ where: { value: ARIA } });
    ariaId = credential.adventurerId;
    await prisma.credential.upsert({
      where: { value: DISABLED },
      update: { enabled: false, adventurerId: ariaId },
      create: { value: DISABLED, enabled: false, adventurerId: ariaId, type: CredentialType.QRCODE },
    });
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    const rankF = await prisma.rank.findUniqueOrThrow({ where: { code: 'F' } });
    await prisma.purchase.deleteMany({ where: { playerId: ariaId } });
    await prisma.playerItem.deleteMany({ where: { playerId: ariaId } });
    await prisma.adventurerProfile.update({
      where: { id: ariaId },
      data: { gold: 50, currentRankId: rankF.id },
    });
  });

  afterAll(async () => {
    await prisma.credential.deleteMany({ where: { value: DISABLED } });
    await app.close();
  });

  it('AC1: lists purchasable and rank-locked items', async () => {
    const res = await scan().expect(200);
    const byId = Object.fromEntries(res.body.items.map((i: any) => [i.itemId, i]));

    expect(res.body.player).toMatchObject({ name: 'Aria', gold: 50, attack: 0, defense: 0 });
    expect(byId['item-wooden-sword']).toMatchObject({ purchasable: true, lockedReason: null });
    expect(byId['item-leather-armor']).toMatchObject({ purchasable: true, lockedReason: null });
    expect(byId['item-iron-sword']).toMatchObject({
      purchasable: false,
      lockedReason: 'RANK_REQUIRED',
      requiredRank: expect.objectContaining({ code: 'E' }),
    });
    expect(byId['item-chain-mail'].lockedReason).toBe('RANK_REQUIRED');
  });

  it('AC2/AC14: buys and equips, records the purchase, emits events', async () => {
    const emitSpy = vi.spyOn(events, 'emit');
    const res = await buy('item-wooden-sword', { equip: true }).expect(201);

    expect(res.body).toMatchObject({
      player: { gold: 20, attack: 3, defense: 0 },
      equipped: true,
      equipment: { WEAPON: { item: { id: 'item-wooden-sword' } }, ARMOR: null },
    });
    const purchase = await prisma.purchase.findUniqueOrThrow({ where: { id: res.body.purchaseId } });
    expect(purchase).toMatchObject({ goldBefore: 50, goldAfter: 20, price: 30 });

    const types = emitSpy.mock.calls.map(([type, displayId]) => `${type}@${displayId}`);
    expect(types).toEqual(['shop.purchase_completed@shop-01', 'equipment.changed@shop-01']);
  });

  it('AC3: rejects buying an owned item without charging', async () => {
    await buy('item-wooden-sword').expect(201);
    const owned = (await scan()).body.items.find((i: any) => i.itemId === 'item-wooden-sword');
    expect(owned.lockedReason).toBe('ALREADY_OWNED');

    const emitSpy = vi.spyOn(events, 'emit');
    const res = await buy('item-wooden-sword').expect(409);
    expect(res.body.code).toBe('ALREADY_OWNED');
    expect(emitSpy).not.toHaveBeenCalled();
    expect((await scan()).body.player.gold).toBe(20);
  });

  it('AC4: rejects a purchase the adventurer cannot afford', async () => {
    await buy('item-leather-armor').expect(201); // 50 -> 10
    const sword = (await scan()).body.items.find((i: any) => i.itemId === 'item-wooden-sword');
    expect(sword.lockedReason).toBe('INSUFFICIENT_GOLD');

    const res = await buy('item-wooden-sword').expect(409);
    expect(res.body.code).toBe('INSUFFICIENT_GOLD');
    expect(await prisma.playerItem.count({ where: { playerId: ariaId } })).toBe(1);
  });

  it('rejects rank-locked and unknown items', async () => {
    await prisma.adventurerProfile.update({ where: { id: ariaId }, data: { gold: 500 } });
    expect((await buy('item-iron-sword').expect(409)).body.code).toBe('RANK_REQUIRED');
    expect((await buy('item-does-not-exist').expect(400)).body.code).toBe('ITEM_NOT_AVAILABLE');
  });

  it('AC5: replays the same requestId without charging twice', async () => {
    const requestId = randomUUID();
    const first = await buy('item-wooden-sword', { requestId }).expect(201);
    const second = await buy('item-wooden-sword', { requestId }).expect(201);

    expect(second.body.purchaseId).toBe(first.body.purchaseId);
    expect(second.body.player.gold).toBe(20);
    expect(await prisma.purchase.count({ where: { playerId: ariaId } })).toBe(1);
  });

  it('AC6: concurrent purchases never overdraw gold', async () => {
    // 50 gold: sword (30) + armor (40) cannot both succeed
    const results = await Promise.all([buy('item-wooden-sword'), buy('item-leather-armor')]);
    const statuses = results.map((r) => r.status).sort((a, b) => a - b);

    expect(statuses).toEqual([201, 409]);
    const profile = await prisma.adventurerProfile.findUniqueOrThrow({ where: { id: ariaId } });
    expect(profile.gold).toBeGreaterThanOrEqual(0);
    expect(await prisma.purchase.count({ where: { playerId: ariaId } })).toBe(1);
  });

  it('AC7: rejects disabled credentials', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/shops/shop-01/scan')
      .set(staff)
      .send({ credentialValue: DISABLED })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/shops/shop-01/purchases')
      .set(staff)
      .send({ credentialValue: DISABLED, itemId: 'item-wooden-sword', requestId: randomUUID() })
      .expect(400);
  });

  it('AC8-AC10: equips, swaps and unequips through the inventory API', async () => {
    await prisma.adventurerProfile.update({ where: { id: ariaId }, data: { gold: 500 } });
    const sword = await buy('item-wooden-sword', { equip: true }).expect(201);
    const armor = await buy('item-leather-armor').expect(201);
    expect(armor.body.equipped).toBe(false);

    const inventory = await request(app.getHttpServer())
      .get(`/api/v1/players/${ariaId}/inventory`)
      .expect(200);
    const armorEntry = inventory.body.items.find((i: any) => i.item.id === 'item-leather-armor');

    const equipped = await request(app.getHttpServer())
      .post(`/api/v1/players/${ariaId}/equipment`)
      .set(staff)
      .send({ playerItemId: armorEntry.playerItemId })
      .expect(200);
    expect(equipped.body).toMatchObject({ attack: 3, defense: 3 });

    // Swap weapons: only one WEAPON may stay equipped
    const rankE = await prisma.rank.findUniqueOrThrow({ where: { code: 'E' } });
    await prisma.adventurerProfile.update({ where: { id: ariaId }, data: { currentRankId: rankE.id } });
    await buy('item-iron-sword', { equip: true }).expect(201);
    const afterSwap = await request(app.getHttpServer())
      .get(`/api/v1/players/${ariaId}/inventory`)
      .expect(200);
    expect(afterSwap.body.equipment.WEAPON.item.id).toBe('item-iron-sword');
    expect(afterSwap.body.items.filter((i: any) => i.equipped && i.item.type === 'WEAPON')).toHaveLength(1);
    expect(afterSwap.body.items.find((i: any) => i.item.id === 'item-wooden-sword').equipped).toBe(false);
    expect(sword.body.purchaseId).toBeDefined();

    const unequipped = await request(app.getHttpServer())
      .delete(`/api/v1/players/${ariaId}/equipment/WEAPON`)
      .set(staff)
      .expect(200);
    expect(unequipped.body).toMatchObject({ attack: 0, defense: 3, equipment: { WEAPON: null } });

    await request(app.getHttpServer())
      .delete(`/api/v1/players/${ariaId}/equipment/WEAPON`)
      .set(staff)
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/api/v1/players/${ariaId}/equipment/HELMET`)
      .set(staff)
      .expect(400);
  });

  it('includes inventory in the guild scan', async () => {
    await buy('item-wooden-sword', { equip: true }).expect(201);
    const res = await request(app.getHttpServer())
      .post('/api/v1/guild/scan')
      .set(staff)
      .send({ credentialValue: ARIA })
      .expect(201);
    expect(res.body.inventory).toMatchObject({ attack: 3, equipment: { WEAPON: { item: { id: 'item-wooden-sword' } } } });
  });
});
