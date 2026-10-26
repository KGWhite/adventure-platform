import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';

// Logs in as the seeded development staff account and returns the header that
// world node endpoints (battles, shops, guild, quests, equipment) require.
export async function staffAuthHeader(app: INestApplication<App>) {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ username: 'staff', password: 'staff123' })
    .expect(200);
  return { Authorization: `Bearer ${res.body.accessToken}` };
}
