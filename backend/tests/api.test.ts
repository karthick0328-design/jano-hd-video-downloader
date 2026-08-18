process.env.NODE_ENV = 'test';

import request from 'supertest';
import app from '../src/app';

describe('Express API Endpoints', () => {
  it('GET /api/health should return ok status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/media/analyze with invalid URL should return 400 error', async () => {
    const res = await request(app)
      .post('/api/media/analyze')
      .send({ url: 'https://unsupported-site.com/video' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/download with invalid URL should return 400 error', async () => {
    const res = await request(app)
      .post('/api/download')
      .send({ url: 'http://127.0.0.1/malicious' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/download/:jobId with non-existent jobId should return 404', async () => {
    const res = await request(app).get('/api/download/non_existent_job_id');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
