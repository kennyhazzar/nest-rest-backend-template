import * as supertest from 'supertest';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

export class TestResourceManager {
  private app?: NestFastifyApplication;
  private extraCleanups: Array<() => Promise<void>> = [];

  register(_key: 'app', app: NestFastifyApplication): void {
    this.app = app;
  }

  addCleanup(fn: () => Promise<void>): void {
    this.extraCleanups.push(fn);
  }

  async cleanup(): Promise<void> {
    for (const fn of this.extraCleanups.reverse()) {
      await fn().catch((e: unknown) => console.warn('[cleanup]', e));
    }
    if (this.app) {
      await this.app.close().catch((e: unknown) => console.warn('[cleanup] app.close:', e));
    }
  }
}

/** Obtain an access token for a seeded user. */
export async function loginAs(request: supertest.SuperAgentTest, email: string, password: string): Promise<string> {
  const res = await request.post('/api/v1/auth/login').send({ email, password }).expect(200);
  return (res.body as { accessToken: string }).accessToken;
}
