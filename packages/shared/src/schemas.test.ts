import { describe, expect, it } from 'vitest';
import {
  attributeSchema,
  listObjectsResponseSchema,
  recordSchema,
} from './schemas.js';

describe('attributeSchema', () => {
  it('accepts a valid attribute of each flavor', () => {
    for (const type of ['text', 'number', 'select', 'date', 'email', 'url', 'checkbox']) {
      expect(
        attributeSchema.parse({
          id: 'attr_x',
          objectId: 'obj_x',
          key: 'some_key',
          label: 'Some key',
          type,
          options: type === 'select' ? ['a', 'b'] : [],
        }),
      ).toMatchObject({ type });
    }
  });

  it('rejects an unknown attribute type', () => {
    expect(() =>
      attributeSchema.parse({
        id: 'attr_x',
        objectId: 'obj_x',
        key: 'some_key',
        label: 'X',
        type: 'rating',
        options: [],
      }),
    ).toThrow();
  });

  it('rejects a non-snake_case key', () => {
    expect(() =>
      attributeSchema.parse({
        id: 'attr_x',
        objectId: 'obj_x',
        key: 'Bad-Key',
        label: 'X',
        type: 'text',
        options: [],
      }),
    ).toThrow();
  });
});

describe('recordSchema', () => {
  it('accepts every field value kind, including null', () => {
    const parsed = recordSchema.parse({
      id: 'rec_x',
      objectId: 'obj_x',
      data: { name: 'Northwind', value: 40000, active: true, closed_at: null },
      version: 1,
      createdAt: 1760000000000,
      updatedAt: 1760000000000,
    });
    expect(parsed.data['name']).toBe('Northwind');
  });

  it('rejects nested objects in data', () => {
    expect(() =>
      recordSchema.parse({
        id: 'rec_x',
        objectId: 'obj_x',
        data: { bad: { nested: true } },
        version: 1,
        createdAt: 0,
        updatedAt: 0,
      }),
    ).toThrow();
  });
});

describe('listObjectsResponseSchema', () => {
  it('round-trips a realistic objects payload', () => {
    const parsed = listObjectsResponseSchema.parse({
      objects: [
        {
          id: 'obj_deals',
          slug: 'deals',
          name: 'Deals',
          createdAt: 1760000000000,
          attributes: [
            {
              id: 'attr_stage',
              objectId: 'obj_deals',
              key: 'stage',
              label: 'Stage',
              type: 'select',
              options: ['New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'],
            },
          ],
        },
      ],
    });
    expect(parsed.objects).toHaveLength(1);
    expect(parsed.objects[0]?.attributes[0]?.options).toContain('Proposal');
  });
});
