import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { app } from '../index';

describe('Integration — Auth endpoints', () => {
  const agent = request.agent(app);
  const userEmail = `testuser+${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const userPassword = 'Password123';
  let csrfToken: string | null = null;

  beforeAll(async () => {
    const res = await agent.get('/api/csrf-token');
    csrfToken = res.body?.data?.token || res.headers['x-csrf-token'];
  });

  it('POST /api/auth/register should create a new user account', async () => {
    const res = await agent
      .post('/api/auth/register')
      .set('x-csrf-token', csrfToken || '')
      .send({
        email: userEmail,
        password: userPassword,
        firstName: 'Test',
        lastName: 'User',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data.user');
    expect(res.body.data.user).toMatchObject({
      email: userEmail,
      firstName: 'Test',
      lastName: 'User',
    });
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
  });

  let accessToken: string;

  it('POST /api/auth/login should authenticate the registered user', async () => {
    const res = await agent
      .post('/api/auth/login')
      .set('x-csrf-token', csrfToken || '')
      .send({
        email: userEmail,
        password: userPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user).toMatchObject({ email: userEmail });

    accessToken = res.body.data.accessToken;
  });

  it('POST /api/v1/auth/login should authenticate using versioned API prefix', async () => {
    const res = await agent
      .post('/api/v1/auth/login')
      .set('x-csrf-token', csrfToken || '')
      .send({
        email: userEmail,
        password: userPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user).toMatchObject({ email: userEmail });
  });

  it('GET /api/admin/dashboard returns 403 for a normal authenticated user', async () => {
    const res = await agent
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${accessToken}`);

    expect([401, 403]).toContain(res.status);
    expect(res.body).toHaveProperty('success', false);
  });
});
