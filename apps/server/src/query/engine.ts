import type { Attribute, FilterCondition, ListRecordsQuery, SortSpec } from '@tabella/shared';

/**
 * Compiles filter/sort/cursor into parameterized SQL.
 *
 * Expression discipline (ADR-0002): compiled expressions must match the expression
 * indexes exactly — lower() for text, ::numeric for numbers — or the index is unused.
 * Every value is bound as a parameter; keys are validated against the object's
 * attribute definitions before any SQL is built, so no identifier can be injected.
 */

export class QueryValidationError extends Error {
  constructor(
    message: string,
    readonly issues: { path: string; message: string }[],
  ) {
    super(message);
    this.name = 'QueryValidationError';
  }
}

/** Meta keys present on every record, mapped to real columns. */
const META_COLUMNS: Record<string, string> = {
  created_at: 'created_at',
  updated_at: 'updated_at',
  version: 'version',
};

export type AttrMap = Map<string, Attribute>;

const TEXT_TYPES = new Set(['text', 'email', 'url']);

const DEFAULT_SORT: readonly SortSpec[] = [{ key: 'created_at', dir: 'desc' }];

/** SQL expression for a key, matching the expression-index shapes (ADR-0002). */
function keyExpr(key: string, attrs: AttrMap): string {
  const column = META_COLUMNS[key];
  if (column) return `records.${column}`;
  const attr = attrs.get(key);
  if (!attr) {
    throw new QueryValidationError(`Unknown key "${key}"`, [
      { path: 'key', message: `Unknown key "${key}"` },
    ]);
  }
  switch (attr.type) {
    case 'text':
    case 'email':
    case 'url':
      return `lower(data->>'${attr.key}')`;
    case 'number':
      return `((data->>'${attr.key}')::numeric)`;
    case 'checkbox':
      return `((data->>'${attr.key}')::boolean)`;
    case 'select':
    case 'date':
      return `(data->>'${attr.key}')`;
  }
}

function typeOf(key: string, attrs: AttrMap): string {
  return META_COLUMNS[key] ? 'number' : (attrs.get(key)?.type ?? '');
}

const OPS_BY_TYPE: Record<string, readonly string[]> = {
  text: ['eq', 'neq', 'contains', 'in', 'is_empty'],
  email: ['eq', 'neq', 'contains', 'in', 'is_empty'],
  url: ['eq', 'neq', 'contains', 'in', 'is_empty'],
  select: ['eq', 'neq', 'in', 'is_empty'],
  date: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'is_empty'],
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'is_empty'],
  checkbox: ['eq', 'neq', 'is_empty'],
};

function assertConditionValid(condition: FilterCondition, attrs: AttrMap): void {
  const type = typeOf(condition.key, attrs);
  if (!type) {
    throw new QueryValidationError(`Unknown key "${condition.key}"`, [
      { path: 'key', message: `Unknown key "${condition.key}"` },
    ]);
  }
  if (!(OPS_BY_TYPE[type]?.includes(condition.op))) {
    throw new QueryValidationError(
      `Operator "${condition.op}" is not supported for ${type} attributes`,
      [{ path: 'op', message: `"${condition.op}" not supported for type ${type}` }],
    );
  }
  if (condition.op !== 'is_empty' && condition.value === undefined) {
    throw new QueryValidationError(`Operator "${condition.op}" requires a value`, [
      { path: 'value', message: 'Required' },
    ]);
  }
  if (condition.op === 'in' && !Array.isArray(condition.value)) {
    throw new QueryValidationError('Operator "in" requires an array value', [
      { path: 'value', message: 'Must be an array' },
    ]);
  }
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function compileCondition(condition: FilterCondition, attrs: AttrMap, params: unknown[]): string {
  assertConditionValid(condition, attrs);
  const expr = keyExpr(condition.key, attrs);
  const type = typeOf(condition.key, attrs);
  const insensitive = TEXT_TYPES.has(type);
  const bind = (value: unknown): string => {
    params.push(value);
    return `$${params.length}`;
  };
  const normalize = (value: unknown): unknown =>
    insensitive && value !== null && typeof value !== 'object' ? String(value).toLowerCase() : value;

  switch (condition.op) {
    case 'eq':
    case 'neq': {
      const sqlOp = condition.op === 'eq' ? '=' : '<>';
      if (type === 'checkbox') return `${expr} ${sqlOp} ${bind(condition.value)}::boolean`;
      return `${expr} ${sqlOp} ${bind(normalize(condition.value))}`;
    }
    case 'contains':
      return `${expr} LIKE '%' || ${bind(escapeLike(String(condition.value).toLowerCase()))} || '%' ESCAPE '\\'`;
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const sqlOp = { gt: '>', gte: '>=', lt: '<', lte: '<=' }[condition.op];
      return `${expr} ${sqlOp} ${bind(normalize(condition.value))}`;
    }
    case 'in': {
      // assertConditionValid guarantees an array here.
      const values = (condition.value as unknown as (string | number | boolean)[]).map(normalize);
      return `${expr} = ANY(${bind(values)})`;
    }
    case 'is_empty':
      return `(data->>'${condition.key}') IS NULL`;
  }
}

/** Effective sorts (default: created_at desc) + matching SQL expressions. */
function compileSorts(query: ListRecordsQuery, attrs: AttrMap): { sorts: SortSpec[]; exprs: string[] } {
  const sorts = query.sort.length > 0 ? query.sort : [...DEFAULT_SORT];
  const exprs = sorts.map((sort) => keyExpr(sort.key, attrs));
  return { sorts, exprs };
}

// --- cursor: opaque base64url(JSON { v: [...], id }) --------------------------------

export function encodeCursor(values: (string | number | boolean | null)[], id: string): string {
  return Buffer.from(JSON.stringify({ v: values, id }), 'utf8').toString('base64url');
}

export function decodeCursor(
  cursor: string,
  sorts: SortSpec[],
): { values: (string | number | boolean | null)[]; id: string } {
  let parsed: { v?: unknown; id?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as typeof parsed;
  } catch {
    throw new QueryValidationError('Malformed cursor', [
      { path: 'cursor', message: 'Not a valid cursor' },
    ]);
  }
  const { v, id } = parsed;
  if (!Array.isArray(v) || v.length !== sorts.length || typeof id !== 'string') {
    throw new QueryValidationError('Cursor does not match the sort spec', [
      { path: 'cursor', message: 'Cursor/sort mismatch (did the sort change mid-pagination?)' },
    ]);
  }
  return { values: v as (string | number | boolean | null)[], id };
}

/**
 * Keyset predicate via the OR-of-ANDs expansion — correct for mixed asc/desc sorts
 * (a single row-wise comparison is not) and still index-friendly. Uses full
 * expressions, not SELECT aliases, because WHERE cannot reference them:
 *   (e0 > v0) OR (e0 = v0 AND e1 < v1) OR (e0 = v0 AND e1 = v1 AND id > lastId)
 */
function compileKeyset(
  sorts: SortSpec[],
  exprs: string[],
  values: (string | number | boolean | null)[],
  lastId: string,
  params: unknown[],
): string {
  const orParts: string[] = [];
  for (let i = 0; i <= sorts.length; i++) {
    const equalities: string[] = [];
    for (let j = 0; j < i; j++) {
      params.push(values[j]);
      equalities.push(`(${exprs[j]}) = $${params.length}`);
    }
    const dir = sorts[i]?.dir ?? sorts[sorts.length - 1]?.dir ?? 'asc';
    const op = dir === 'asc' ? '>' : '<';
    const target = i === sorts.length ? 'id' : `(${exprs[i]})`;
    const value = i === sorts.length ? lastId : values[i]!;
    params.push(value);
    orParts.push(`(${[...equalities, `${target} ${op} $${params.length}`].join(' AND ')})`);
  }
  return `(${orParts.join(' OR ')})`;
}

// --- final compiled page query ------------------------------------------------------

export interface CompiledPageQuery {
  dataSql: string;
  countSql: string;
  params: unknown[];
  countParams: unknown[];
  sortExprs: string[];
  sorts: SortSpec[];
  limit: number;
}

export function compilePageQuery(
  query: ListRecordsQuery,
  attrs: AttrMap,
  objectId: string,
): CompiledPageQuery {
  const { sorts, exprs } = compileSorts(query, attrs);

  // params[0] is always the object id; filter values follow; keyset values last.
  const params: unknown[] = [objectId];
  const filterSql = query.filter
    .map((condition) => compileCondition(condition, attrs, params))
    .join(' AND ');

  let keysetSql = '';
  if (query.cursor) {
    const { values, id } = decodeCursor(query.cursor, sorts);
    keysetSql = compileKeyset(sorts, exprs, values, id, params);
  }

  const sortSelects = exprs.map((expr, i) => `, ${expr} AS s${i}`).join('');
  const orderColumns = [
    ...sorts.map((sort, i) => `s${i} ${sort.dir === 'desc' ? 'DESC' : 'ASC'}`),
    `id ${sorts[sorts.length - 1]?.dir === 'desc' ? 'DESC' : 'ASC'}`,
  ];

  const conditions = ['object_id = $1', filterSql, keysetSql].filter(Boolean).join(' AND ');
  const dataSql = `
    SELECT id, object_id, data, version, created_at, updated_at${sortSelects}
    FROM records
    WHERE ${conditions}
    ORDER BY ${orderColumns.join(', ')}
    LIMIT ${query.limit + 1}`;

  // Count ignores the keyset: it is the total for the filter, not the remaining rows.
  const countParams = [...params].slice(0, 1 + query.filter.length);
  const countSql = `SELECT count(*)::int AS total FROM records WHERE ${['object_id = $1', filterSql].filter(Boolean).join(' AND ')}`;

  return { dataSql, countSql, params, countParams, sortExprs: exprs, sorts, limit: query.limit };
}

export function attrsToMap(attributes: Attribute[]): AttrMap {
  return new Map(attributes.map((attr) => [attr.key, attr]));
}
