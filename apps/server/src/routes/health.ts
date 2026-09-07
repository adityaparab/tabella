import type { FastifyPluginAsync } from 'fastify';
import type { HealthResponse } from '@tabella/shared';
import { checkDatabase } from '../db.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async (): Promise<HealthResponse> => {
    const dbUp = await checkDatabase();
    return {
      status: dbUp ? 'ok' : 'degraded',
      db: dbUp ? 'up' : 'down',
      time: Date.now(),
    };
  });
};
