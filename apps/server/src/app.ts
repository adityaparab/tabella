import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { loadConfig } from './config.js';
import { closePool } from './db.js';
import { demoRoutes } from './routes/demo.js';
import { healthRoutes } from './routes/health.js';
import { objectsRoutes } from './routes/objects.js';

export interface BuildAppOptions {
  logger?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = loadConfig();
  const app = Fastify({ logger: options.logger ?? true });

  await app.register(cors, { origin: config.corsOrigin });
  await app.register(objectsRoutes, { prefix: '/api' });
  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(demoRoutes, { prefix: '/api' });

  app.addHook('onClose', async () => {
    await closePool();
  });

  return app;
}
