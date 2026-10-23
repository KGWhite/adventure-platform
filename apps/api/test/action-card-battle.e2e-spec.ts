import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ActionCardType } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

// Requires a migrated and seeded database at DATABASE_URL.
describe('Action Card Battle (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const DISABLED = 'card-e2e-disabled';

  const startBattle = async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/battles')
      .send({ credentialValue: 'cred-demo-002', bossId: 'boss-01', displayId: 'boss-e2e' })
      .expect(201);
    return res.body.id as string;
  };

  const playCard = (battleId: string, cardValue: string) =>
    request(app.getHttpServer()).post(`/api/v1/battles/${battleId}/cards`).send({ cardValue });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.actionCard.upsert({
      where: { value: DISABLED },
      update: { enabled: false },
      create: { value: DISABLED, type: ActionCardType.FIRE, enabled: false },
    });
  });

  afterAll(async () => {
    await prisma.actionCard.deleteMany({ where: { value: DISABLED } });
    await app.close();
  });

  it('AC1: lists the 12 seeded action cards, 3 per type', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/action-cards').expect(200);
    const seeded = res.body.filter((card: any) => card.value.match(/^card-\w+-00\d$/));
    expect(seeded).toHaveLength(12);
    for (const type of ['STRIKE', 'FIRE', 'WATER', 'WIND']) {
      expect(seeded.filter((card: any) => card.type === type)).toHaveLength(3);
    }
  });

  it('charges and casts a combo over HTTP', async () => {
    const battleId = await startBattle();
    const charged = await playCard(battleId, 'card-fire-001').expect(200);
    expect(charged.body).toMatchObject({ result: 'charged', castSlot: [{ type: 'FIRE' }] });

    const cast = await playCard(battleId, 'card-wind-001').expect(200);
    expect(cast.body).toMatchObject({ result: 'cast', skill: { id: 'fire-tornado' }, castSlot: [] });
    expect(cast.body.skill.damage).toBeGreaterThanOrEqual(64);
  });

  it('AC10: rejects unknown and disabled cards and unknown battles', async () => {
    const battleId = await startBattle();
    expect((await playCard(battleId, 'card-nope').expect(404)).body.code).toBe('CARD_NOT_FOUND');
    expect((await playCard(battleId, DISABLED).expect(400)).body.code).toBe('CARD_DISABLED');
    expect((await playCard('battle-missing', 'card-fire-001').expect(404)).body.code).toBe(
      'BATTLE_NOT_FOUND',
    );
    await request(app.getHttpServer())
      .post(`/api/v1/battles/${battleId}/cards`)
      .send({})
      .expect(400);
  });
});
