import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app } from '../index';

describe('Integration — Health endpoints', () => {
  it('GET /api/health returns status and v1 version', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success');
    expect(res.body).toHaveProperty('apiVersion');
    expect(res.body.apiVersion).toBe('v1');
  });

  it('GET /api/v1/health returns the same payload', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.apiVersion).toBe('v1');
  });
});
