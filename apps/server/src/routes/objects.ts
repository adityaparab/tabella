import type { FastifyPluginAsync } from 'fastify';
import type { ListObjectsResponse } from '@tabella/shared';
import { listObjects } from '../repo/objects.js';

export const objectsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/objects', async (): Promise<ListObjectsResponse> => ({
    objects: await listObjects(),
  }));
};
