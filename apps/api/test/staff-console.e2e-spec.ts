import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { EventsService } from './../src/events/events.service.js';
import { staffAuthHeader } from './helpers/staff-auth.js';

// Requires a migrated and seeded database at DATABASE_URL (staff, admin and
// adventurer accounts). Scanning Leon on /status marks his level as seen.
describe('Staff Console (e2e)', () => {
  let app: INestApplication<App>;
  let events: EventsService;
  let staff: Record<string, string>;
  let admin: Record<string, string>;
  let adventurer: Record<string, string>;

  const login = async (username: string, password: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username, password })
      .expect(200);
    return { Authorization: `Bearer ${res.body.accessToken}` };
  };

  const setStage = (nodeId: unknown, headers: Record<string, string> = staff) =>
    request(app.getHttpServer()).put('/api/v1/stage').set(headers).send({ nodeId });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    events = app.get(EventsService);
    staff = await staffAuthHeader(app);
    admin = await login('admin', 'admin123');
    adventurer = await login('adventurer', 'adventurer123');
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await setStage(null).expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('permissions', () => {
    const writeEndpoints: [method: 'post' | 'delete', path: string][] = [
      ['post', '/api/v1/battles/scan'],
      ['post', '/api/v1/battles'],
      ['post', '/api/v1/battles/any/attack'],
      ['post', '/api/v1/battles/any/cards'],
      ['post', '/api/v1/shops/shop-01/scan'],
      ['post', '/api/v1/shops/shop-01/purchases'],
      ['post', '/api/v1/guild/scan'],
      ['post', '/api/v1/player-quests'],
      ['post', '/api/v1/player-quests/any/claim'],
      ['post', '/api/v1/players/any/equipment'],
      ['delete', '/api/v1/players/any/equipment/WEAPON'],
      ['post', '/api/v1/shops/shop-01/preview'],
      ['post', '/api/v1/stage/clear'],
    ];

    it.each(writeEndpoints)('%s %s rejects missing token and USER role', async (method, path) => {
      await request(app.getHttpServer())[method](path).send({}).expect(401);
      await request(app.getHttpServer())[method](path).set(adventurer).send({}).expect(403);
    });

    it.each(writeEndpoints)('%s %s lets STAFF and ADMIN through', async (method, path) => {
      for (const headers of [staff, admin]) {
        const res = await request(app.getHttpServer())[method](path).set(headers).send({});
        expect([401, 403]).not.toContain(res.status);
      }
    });

    it('keeps the /status kiosk and read endpoints public', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/status/scan')
        .send({ credentialValue: 'cred-demo-002' });
      expect(res.status).toBe(200);
      await request(app.getHttpServer()).get('/api/v1/stage').expect(200);
      await request(app.getHttpServer()).get('/api/v1/quests').expect(200);
    });

    it('lets staff log in with the STAFF role', async () => {
      const me = await request(app.getHttpServer()).get('/api/v1/auth/me').set(staff).expect(200);
      expect(me.body.role).toBe('STAFF');
    });
  });

  describe('stage', () => {
    it('switches station, reports it and announces the change once', async () => {
      const emit = vi.spyOn(events, 'emit');
      await setStage('guild-01').expect(200);

      const res = await setStage('shop-01').expect(200);
      expect(res.body.nodeId).toBe('shop-01');
      const current = await request(app.getHttpServer()).get('/api/v1/stage').expect(200);
      expect(current.body.nodeId).toBe('shop-01');

      await setStage('shop-01').expect(200);
      const changes = emit.mock.calls.filter(([type]) => type === 'stage.changed');
      expect(changes).toEqual([
        ['stage.changed', 'all', { nodeId: 'guild-01', previousNodeId: null }],
        ['stage.changed', 'all', { nodeId: 'shop-01', previousNodeId: 'guild-01' }],
      ]);
    });

    it('rejects unknown stations and keeps the current one', async () => {
      await setStage('boss-01').expect(200);
      await setStage('castle-99').expect(400);
      await setStage(undefined).expect(400);

      const current = await request(app.getHttpServer()).get('/api/v1/stage').expect(200);
      expect(current.body.nodeId).toBe('boss-01');
    });

    it('requires STAFF or ADMIN to switch', async () => {
      await request(app.getHttpServer()).put('/api/v1/stage').send({ nodeId: 'guild-01' }).expect(401);
      await setStage('guild-01', adventurer).expect(403);
      await setStage('guild-01', admin).expect(200);
    });
  });

  it('mirrors a status scan to the status big screen', async () => {
    const emit = vi.spyOn(events, 'emit');
    const res = await request(app.getHttpServer())
      .post('/api/v1/status/scan')
      .send({ credentialValue: 'cred-demo-002', displayId: 'status-01' })
      .expect(200);

    const viewed = emit.mock.calls.find(([type]) => type === 'status.viewed');
    expect(viewed?.[1]).toBe('status-01');
    expect(viewed?.[2]).toEqual(res.body);
  });

  describe('big screen mirroring', () => {
    const typed = (spy: ReturnType<typeof vi.spyOn>, type: string) =>
      spy.mock.calls.filter(([eventType]) => eventType === type);

    it('mirrors a shop scan with offers to the shop display', async () => {
      const emit = vi.spyOn(events, 'emit');
      const res = await request(app.getHttpServer())
        .post('/api/v1/shops/shop-01/scan')
        .set(staff)
        .send({ credentialValue: 'cred-demo-002' })
        .expect(200);

      expect(typed(emit, 'shop.scanned')).toEqual([['shop.scanned', 'shop-01', res.body]]);
      expect(res.body.items.length).toBeGreaterThan(0);
    });

    it('previews a shop item and closes the preview', async () => {
      const catalog = await request(app.getHttpServer()).get('/api/v1/shops/shop-01').expect(200);
      const itemId = catalog.body.items[0].itemId;
      const emit = vi.spyOn(events, 'emit');

      const preview = (body: Record<string, unknown>) =>
        request(app.getHttpServer()).post('/api/v1/shops/shop-01/preview').set(staff).send(body);
      await preview({ itemId }).expect(200);
      await preview({ itemId: null }).expect(200);
      await preview({ itemId: 'no-such-item' }).expect(400);
      await preview({}).expect(400);

      expect(typed(emit, 'shop.item_previewed')).toEqual([
        ['shop.item_previewed', 'shop-01', { shopId: 'shop-01', itemId }],
        ['shop.item_previewed', 'shop-01', { shopId: 'shop-01', itemId: null }],
      ]);
    });

    it('mirrors a guild scan with quests and equipment to the guild display', async () => {
      const emit = vi.spyOn(events, 'emit');
      const res = await request(app.getHttpServer())
        .post('/api/v1/guild/scan')
        .set(staff)
        .send({ credentialValue: 'cred-demo-002' })
        .expect(201);

      expect(typed(emit, 'guild.scanned')).toEqual([['guild.scanned', 'guild-01', res.body]]);
      expect(res.body).toHaveProperty('availableQuests');
      expect(res.body).toHaveProperty('inventory');
    });

    it('clears a station back to its idle screen', async () => {
      const emit = vi.spyOn(events, 'emit');
      await request(app.getHttpServer())
        .post('/api/v1/stage/clear')
        .set(staff)
        .send({ nodeId: 'shop-01' })
        .expect(204);
      await request(app.getHttpServer())
        .post('/api/v1/stage/clear')
        .set(staff)
        .send({ nodeId: 'castle-99' })
        .expect(400);

      expect(typed(emit, 'station.cleared')).toEqual([
        ['station.cleared', 'shop-01', { nodeId: 'shop-01' }],
      ]);
    });
  });
});
