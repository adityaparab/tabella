import type { FastifyPluginAsync } from 'fastify';
import type { ListObjectsResponse, ObjectWithAttributes } from '@tabella/shared';

/**
 * Cycle 1: the objects catalog is hardcoded. Cycle 2 moves it behind the query engine
 * backed by the objects/attributes tables (ADR-0001); the route contract does not change.
 */
const COMPANIES: ObjectWithAttributes = {
  id: 'obj_companies',
  slug: 'companies',
  name: 'Companies',
  createdAt: 1760000000000,
  attributes: [
    {
      id: 'attr_companies_name',
      objectId: 'obj_companies',
      key: 'name',
      label: 'Name',
      type: 'text',
      options: [],
    },
    {
      id: 'attr_companies_domain',
      objectId: 'obj_companies',
      key: 'domain',
      label: 'Domain',
      type: 'url',
      options: [],
    },
    {
      id: 'attr_companies_industry',
      objectId: 'obj_companies',
      key: 'industry',
      label: 'Industry',
      type: 'select',
      options: ['SaaS', 'Fintech', 'Healthcare', 'Logistics', 'Retail', 'Energy'],
    },
    {
      id: 'attr_companies_arr',
      objectId: 'obj_companies',
      key: 'arr',
      label: 'ARR ($)',
      type: 'number',
      options: [],
    },
  ],
};

export const objectsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/objects', async (): Promise<ListObjectsResponse> => ({
    objects: [COMPANIES],
  }));
};
