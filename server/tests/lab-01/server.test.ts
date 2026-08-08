import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';

describe('Lab 01 - Express Server Setup Test', () => {
  it('GET / should return 200 OK and valid status message', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('TokTickIT Backend Server');
  });
});
