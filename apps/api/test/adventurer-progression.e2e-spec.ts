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
// Aria's merit, level and quests, so never point it at real data.
describe('Adventurer Progression (e2e)', () => {
  let app: INestApplication<App>;
  let staff: Record<string, string>;
  let prisma: PrismaService;
  let events: EventsService;
  let ariaId: string;

  const ARIA = 'cred-demo-001';
  const DISABLED = 'cred-e2e-progression-disabled';

  const scanStatus = (credentialValue: string) =>
    request(app.getHttpServer()).post('/api/v1/status/scan').send({ credentialValue });

  const resetAria = (merit: number, level: number) =>
    prisma.adventurerProfile.update({
      where: { id: ariaId },
      data: { merit, level, lastSeenLevel: level },
    });

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

    ariaId = (await prisma.credential.findUniqueOrThrow({ where: { value: ARIA } })).adventurerId;
    await prisma.credential.upsert({
      where: { value: DISABLED },
      update: { enabled: false, adventurerId: ariaId },
      create: { value: DISABLED, enabled: false, adventurerId: ariaId, type: CredentialType.QRCODE },
    });
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await prisma.playerQuest.deleteMany({ where: { playerId: ariaId } });
    await resetAria(20, 2);
  });

  afterAll(async () => {
    await prisma.credential.deleteMany({ where: { value: DISABLED } });
    await resetAria(20, 2);
    await app.close();
  });

  it('publishes the level and skill guide for idle screens', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/status/levels').expect(200);
    expect(res.body.levels).toEqual([
      { level: 1, merit: 0 },
      { level: 2, merit: 20 },
      { level: 3, merit: 50 },
      { level: 4, merit: 100 },
      { level: 5, merit: 160 },
    ]);
    const unlockLevels = res.body.skills.map((skill: { requiredLevel: number }) => skill.requiredLevel);
    expect(unlockLevels).toEqual([1, 1, 2, 3, 4, 5]);
  });

  it('AC5: shows level, progress and learned / locked skills', async () => {
    const res = await scanStatus('cred-demo-002').expect(200); // Leon, merit 50
    expect(res.body.level).toMatchObject({ current: 3, nextLevelMerit: 100, meritToNext: 50 });
    const unlocked = Object.fromEntries(res.body.skills.map((s: any) => [s.id, s.unlocked]));
    expect(unlocked).toEqual({
      strike: true,
      'element-bolt': true,
      'element-slash': true,
      'fire-tornado': true,
      'healing-rain': false,
      'steam-burst': false,
    });
    expect(res.body.skills.find((s: any) => s.id === 'healing-rain')).toMatchObject({
      requiredLevel: 4,
      cards: ['WATER', 'WIND'],
    });
  });

  it('AC3: a boss victory alone does not level up, the quest claim does', async () => {
    const emitSpy = vi.spyOn(events, 'emit');
    const server = app.getHttpServer();

    await request(server)
      .post('/api/v1/player-quests')
      .set(staff)
      .send({ credentialValue: ARIA, questId: 'quest-defeat-black-knight' })
      .expect(201);

    const battle = await request(server)
      .post('/api/v1/battles')
      .set(staff)
      .send({ credentialValue: ARIA, bossId: 'boss-01', displayId: 'boss-e2e' })
      .expect(201);
    let state = battle.body;
    while (state.status === 'active') {
      const attack = request(server).post(`/api/v1/battles/${state.id}/attack`).set(staff);
      state = (await attack.expect(201)).body;
    }
    expect(state.status).toBe('victory');
    expect(state.reward.levelUp).toBeNull(); // merit 20 -> 30, still Lv2

    const quest = await request(server).get(`/api/v1/player-quests/player/${ariaId}`).expect(200);
    const claim = await request(server)
      .post(`/api/v1/player-quests/${quest.body.id}/claim`)
      .set(staff)
      .expect(201);
    expect(claim.body.levelUp).toMatchObject({
      from: 2,
      to: 3,
      unlockedSkills: [expect.objectContaining({ id: 'fire-tornado' })],
    });

    const levelUps = emitSpy.mock.calls.filter(([type]) => type === 'adventurer.level_up');
    expect(levelUps).toHaveLength(1);
    expect(levelUps[0][1]).toBe('guild-01');
    const profile = await prisma.adventurerProfile.findUniqueOrThrow({ where: { id: ariaId } });
    expect(profile).toMatchObject({ merit: 50, level: 3 });
  });

  it('AC6: celebrates new skills once after a level up', async () => {
    await prisma.adventurerProfile.update({ where: { id: ariaId }, data: { merit: 100, level: 4 } });

    const first = await scanStatus(ARIA).expect(200);
    expect(first.body.leveledUpSinceLastSeen).toBe(true);
    expect(first.body.skills.filter((s: any) => s.isNew).map((s: any) => s.id)).toEqual([
      'fire-tornado',
      'healing-rain',
    ]);

    const second = await scanStatus(ARIA).expect(200);
    expect(second.body.leveledUpSinceLastSeen).toBe(false);
    expect(second.body.skills.some((s: any) => s.isNew)).toBe(false);
  });

  it('AC7 / AC8: rejects disabled cards and shows MAX at the level cap', async () => {
    expect((await scanStatus(DISABLED).expect(400)).body.code).toBe('CREDENTIAL_DISABLED');
    expect((await scanStatus('cred-unknown').expect(404)).body.code).toBe('CREDENTIAL_NOT_FOUND');

    await prisma.adventurerProfile.update({ where: { id: ariaId }, data: { merit: 999 } });
    const res = await scanStatus(ARIA).expect(200);
    expect(res.body.level).toMatchObject({ current: 5, max: 5, nextLevelMerit: null, meritToNext: null });
    expect(res.body.skills.every((s: any) => s.unlocked)).toBe(true);
  });
});
