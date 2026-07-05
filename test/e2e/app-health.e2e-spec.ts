import { getTestApp, TestApp } from '../setup/app';

describe('Health endpoints (E2E)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await getTestApp();
  });

  afterAll(async () => {
    await testApp.close();
  });

  it('GET /api/v1/health/live → 200', async () => {
    await testApp.request.get('/api/v1/health/live').expect(200);
  });

  it('GET /api/v1/health/ready → 200 (DB + Redis reachable)', async () => {
    const res = await testApp.request.get('/api/v1/health/ready').expect(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  it('GET /api/v1/health → 200 full check', async () => {
    const res = await testApp.request.get('/api/v1/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  it('responds with JSON content-type', async () => {
    const res = await testApp.request.get('/api/v1/health/live');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('protected route without token → 401', async () => {
    await testApp.request.get('/api/v1/users').expect(401);
  });
});
