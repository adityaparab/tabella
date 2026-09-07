import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { DEFAULT_COUNTS } from '../seed/generate.js';
import { seedAll } from '../seed/seed.js';

const reseedBodySchema = z.object({
  counts: z
    .object({
      companies: z.number().int().min(0).max(200_000),
      people: z.number().int().min(0).max(200_000),
      deals: z.number().int().min(0).max(200_000),
    })
    .partial()
    .optional(),
});

export const demoRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Reset the demo dataset. Kept unauthenticated on purpose: the demo login gate lands in
   * Cycle 7 and there is nothing here worth protecting yet.
   */
  app.post('/demo/reseed', async (request, reply) => {
    const parsed = reseedBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid reseed body', issues: parsed.error.issues });
    }
    const requested = parsed.data.counts;
    const counts = requested
      ? {
          companies: requested.companies ?? DEFAULT_COUNTS.companies,
          people: requested.people ?? DEFAULT_COUNTS.people,
          deals: requested.deals ?? DEFAULT_COUNTS.deals,
        }
      : DEFAULT_COUNTS;
    const result = await seedAll(counts);
    return { ok: true, counts: result.counts, durationMs: result.durationMs };
  });
};
