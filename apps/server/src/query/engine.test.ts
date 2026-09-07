import { describe, expect, it } from 'vitest';
import type { Attribute } from '@tabella/shared';
import { attrsToMap, compilePageQuery, decodeCursor, encodeCursor, QueryValidationError } from './engine.js';

const attrs: Attribute[] = [
  { id: 'a1', objectId: 'o1', key: 'name', label: 'Name', type: 'text', options: [] },
  { id: 'a2', objectId: 'o1', key: 'stage', label: 'Stage', type: 'select', options: ['New', 'Won'] },
  { id: 'a3', objectId: 'o1', key: 'value', label: 'Value', type: 'number', options: [] },
  { id: 'a4', objectId: 'o1', key: 'created', label: 'Created', type: 'date', options: [] },
];
const map = attrsToMap(attrs);

const query = (overrides: Record<string, unknown> = {}) => ({
  filter: [],
  sort: [],
  limit: 50,
  ...overrides,
});

describe('cursor codec', () => {
  it('round-trips values and id', () => {
    const cursor = encodeCursor(['northwind', 42000, null], 'rec_de1');
    expect(decodeCursor(cursor, [
      { key: 'name', dir: 'asc' },
      { key: 'value', dir: 'desc' },
      { key: 'close_date', dir: 'asc' },
    ])).toEqual({ values: ['northwind', 42000, null], id: 'rec_de1' });
  });

  it('rejects garbage and sort mismatches', () => {
    expect(() => decodeCursor('%%%', [])).toThrow(QueryValidationError);
    const cursor = encodeCursor([1], 'x');
    expect(() => decodeCursor(cursor, [])).toThrow(/sort spec/);
  });
});

describe('query compilation', () => {
  it('compiles a filter+sort into parameterized SQL with the index-shaped expressions', () => {
    const compiled = compilePageQuery(
      query({
        filter: [{ key: 'stage', op: 'eq', value: 'New' }],
        sort: [{ key: 'value', dir: 'desc' }],
      }),
      map,
      'obj_deals',
    );
    expect(compiled.dataSql).toContain("((data->>'value')::numeric)");
    expect(compiled.dataSql).toContain('ORDER BY s0 DESC, id DESC');
    expect(compiled.dataSql).toContain('LIMIT 51');
    expect(compiled.params).toEqual(['obj_deals', 'New']);
    expect(compiled.countParams).toEqual(['obj_deals', 'New']);
  });

  it('rejects unknown keys, bad operators, and missing values', () => {
    expect(() => compilePageQuery(query({ filter: [{ key: 'hax', op: 'eq', value: 1 }] }), map, 'o1')).toThrow(
      /Unknown key/,
    );
    expect(() => compilePageQuery(query({ filter: [{ key: 'stage', op: 'contains', value: 'x' }] }), map, 'o1')).toThrow(
      /not supported/,
    );
    expect(() => compilePageQuery(query({ filter: [{ key: 'value', op: 'gt' }] }), map, 'o1')).toThrow(
      /requires a value/,
    );
  });

  it('escapes LIKE wildcards in contains values', () => {
    const compiled = compilePageQuery(
      query({ filter: [{ key: 'name', op: 'contains', value: '50%_off\\' }] }),
      map,
      'o1',
    );
    expect(String(compiled.params[1])).toBe('50\\%\\_off\\\\');
  });
});
