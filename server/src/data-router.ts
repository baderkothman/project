import { Router, type Response } from 'express';
import { z } from 'zod';
import { optionalAuth, requireAuth } from './auth';
import { pool } from './db';
import { broadcast } from './realtime';
import type {
  AuthenticatedRequest,
  DataFilter,
  FilterOperator,
} from './types';

type TableName =
  | 'profiles'
  | 'books'
  | 'followers'
  | 'wishlist'
  | 'messages'
  | 'shared_books';

interface TableDefinition {
  readable: readonly string[];
  privateReadable?: readonly string[];
  writable: readonly string[];
  publicRead: boolean;
}

const tableDefinitions: Record<TableName, TableDefinition> = {
  profiles: {
    readable: [
      'id',
      'username',
      'first_name',
      'last_name',
      'bio',
      'avatar_url',
      'books_read',
      'books_exchanged',
      'library_count',
      'wishlist_count',
      'history_count',
      'created_at',
      'updated_at',
    ],
    privateReadable: ['birthdate', 'search_history'],
    writable: ['first_name', 'last_name', 'bio', 'avatar_url', 'search_history'],
    publicRead: true,
  },
  books: {
    readable: [
      'id',
      'user_id',
      'title',
      'author',
      'description',
      'category',
      'language',
      'condition',
      'price',
      'pages',
      'isbn',
      'location',
      'images',
      'created_at',
      'updated_at',
    ],
    writable: [
      'title',
      'author',
      'description',
      'category',
      'language',
      'condition',
      'price',
      'pages',
      'isbn',
      'location',
      'images',
    ],
    publicRead: true,
  },
  followers: {
    readable: ['id', 'follower_id', 'following_id', 'created_at'],
    writable: ['follower_id', 'following_id'],
    publicRead: true,
  },
  wishlist: {
    readable: ['id', 'user_id', 'book_id', 'google_books_id', 'created_at'],
    writable: ['book_id', 'google_books_id'],
    publicRead: false,
  },
  messages: {
    readable: ['id', 'sender_id', 'recipient_id', 'content', 'read', 'created_at'],
    writable: ['recipient_id', 'content', 'read'],
    publicRead: false,
  },
  shared_books: {
    readable: [
      'id',
      'book_id',
      'sender_id',
      'recipient_id',
      'title',
      'image',
      'preview_link',
      'created_at',
    ],
    writable: ['book_id', 'recipient_id', 'title', 'image', 'preview_link'],
    publicRead: false,
  },
};

const filterSchema = z.object({
  column: z.string(),
  operator: z.enum(['eq', 'neq', 'ilike', 'in']),
  value: z.unknown(),
});

const mutationSchema = z.object({
  operation: z.enum(['insert', 'update', 'delete']),
  values: z.record(z.string(), z.unknown()).optional(),
  filters: z.array(filterSchema).default([]),
});

function isTableName(value: string): value is TableName {
  return value in tableDefinitions;
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function parseFilters(raw: unknown): DataFilter[] {
  if (typeof raw !== 'string' || !raw) return [];
  try {
    return z.array(filterSchema).parse(JSON.parse(raw));
  } catch {
    throw Object.assign(new Error('Invalid query filters'), { statusCode: 400 });
  }
}

function parseSelectedColumns(
  table: TableName,
  raw: unknown,
  userId: string | undefined,
  filters: DataFilter[],
) {
  const definition = tableDefinitions[table];
  const ownsProfile =
    table === 'profiles' &&
    Boolean(userId) &&
    filters.some(
      (filter) =>
        filter.column === 'id' &&
        filter.operator === 'eq' &&
        filter.value === userId,
    );
  const allowed = [
    ...definition.readable,
    ...(ownsProfile ? definition.privateReadable ?? [] : []),
  ];
  if (typeof raw !== 'string' || raw === '*' || raw.trim() === '') {
    return [...definition.readable];
  }
  const requested = raw
    .split(',')
    .map((column) => column.trim())
    .filter(Boolean);
  if (requested.some((column) => !allowed.includes(column))) {
    throw Object.assign(new Error('One or more selected columns are not allowed'), {
      statusCode: 400,
    });
  }
  return requested;
}

function buildWhereClause(
  table: TableName,
  filters: DataFilter[],
  startingParameter = 1,
) {
  const allowed = tableDefinitions[table].readable;
  const clauses: string[] = [];
  const values: unknown[] = [];

  filters.forEach((filter) => {
    if (!allowed.includes(filter.column)) {
      throw Object.assign(new Error(`Filtering by ${filter.column} is not allowed`), {
        statusCode: 400,
      });
    }
    if (filter.value === undefined) {
      throw Object.assign(new Error(`Missing filter value for ${filter.column}`), {
        statusCode: 400,
      });
    }
    const parameter = `$${startingParameter + values.length}`;
    const column = quoteIdentifier(filter.column);
    const operator: FilterOperator = filter.operator;

    if (operator === 'eq') clauses.push(`${column} = ${parameter}`);
    if (operator === 'neq') clauses.push(`${column} <> ${parameter}`);
    if (operator === 'ilike') clauses.push(`${column} ILIKE ${parameter}`);
    if (operator === 'in') clauses.push(`${column} = ANY(${parameter})`);
    values.push(filter.value);
  });

  return {
    sql: clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
}

function sanitizeValues(table: TableName, values: Record<string, unknown>) {
  const allowed = tableDefinitions[table].writable;
  return Object.fromEntries(
    Object.entries(values).filter(
      ([key, value]) => allowed.includes(key) && value !== undefined,
    ),
  );
}

function enforceReadScope(
  req: AuthenticatedRequest,
  table: TableName,
  filters: DataFilter[],
) {
  const userId = req.authUser?.id;
  if (tableDefinitions[table].publicRead) return filters;
  if (!userId) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }

  if (table === 'wishlist') {
    return [
      ...filters.filter((filter) => filter.column !== 'user_id'),
      { column: 'user_id', operator: 'eq' as const, value: userId },
    ];
  }

  if (table === 'messages' || table === 'shared_books') {
    throw Object.assign(
      new Error('Use the authenticated chat endpoint for conversation data'),
      { statusCode: 403 },
    );
  }
  return filters;
}

function enforceMutationScope(
  req: AuthenticatedRequest,
  table: TableName,
  operation: 'insert' | 'update' | 'delete',
  values: Record<string, unknown>,
  filters: DataFilter[],
) {
  const userId = req.authUser!.id;
  const nextValues = { ...values };
  let nextFilters = [...filters];

  if (table === 'profiles') {
    if (operation === 'insert') throw Object.assign(new Error('Profiles are created at sign-up'), { statusCode: 403 });
    nextFilters = [
      ...nextFilters.filter((filter) => filter.column !== 'id'),
      { column: 'id', operator: 'eq', value: userId },
    ];
  }

  if (table === 'books') {
    if (operation === 'insert') nextValues.user_id = userId;
    else
      nextFilters = [
        ...nextFilters,
        { column: 'user_id', operator: 'eq', value: userId },
      ];
  }

  if (table === 'followers') {
    if (operation === 'update') throw Object.assign(new Error('Follower records are immutable'), { statusCode: 403 });
    if (operation === 'insert') nextValues.follower_id = userId;
    if (operation === 'delete')
      nextFilters = [
        ...nextFilters.filter((filter) => filter.column !== 'follower_id'),
        { column: 'follower_id', operator: 'eq', value: userId },
      ];
  }

  if (table === 'wishlist') {
    if (operation === 'insert') nextValues.user_id = userId;
    else
      nextFilters = [
        ...nextFilters.filter((filter) => filter.column !== 'user_id'),
        { column: 'user_id', operator: 'eq', value: userId },
      ];
  }

  if (table === 'messages') {
    if (operation === 'delete') throw Object.assign(new Error('Message deletion is not supported'), { statusCode: 403 });
    if (operation === 'insert') nextValues.sender_id = userId;
    if (operation === 'update')
      nextFilters = [
        ...nextFilters.filter((filter) => filter.column !== 'recipient_id'),
        { column: 'recipient_id', operator: 'eq', value: userId },
      ];
  }

  if (table === 'shared_books') {
    if (operation !== 'insert') throw Object.assign(new Error('Shared books are immutable'), { statusCode: 403 });
    nextValues.sender_id = userId;
  }

  return { values: nextValues, filters: nextFilters };
}

function sendError(res: Response, error: unknown) {
  const status =
    typeof error === 'object' &&
    error &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
      ? error.statusCode
      : 500;
  const message = error instanceof Error ? error.message : 'Unexpected data error';
  res.status(status).json({ error: { message, code: status === 500 ? 'DATA_ERROR' : 'BAD_REQUEST' } });
}

export const dataRouter = Router();
dataRouter.use(optionalAuth);

dataRouter.get('/:table', async (req: AuthenticatedRequest, res) => {
  try {
    const tableParameter = Array.isArray(req.params.table)
      ? req.params.table[0]
      : req.params.table;
    if (!isTableName(tableParameter)) {
      res.status(404).json({ error: { message: 'Unknown data resource', code: 'NOT_FOUND' } });
      return;
    }
    const table = tableParameter;
    const filters = enforceReadScope(req, table, parseFilters(req.query.filters));
    const selected = parseSelectedColumns(
      table,
      req.query.select,
      req.authUser?.id,
      filters,
    );
    const where = buildWhereClause(table, filters);

    let sql = `SELECT ${selected.map(quoteIdentifier).join(', ')} FROM ${quoteIdentifier(table)}${where.sql}`;
    const orderColumn =
      typeof req.query.order === 'string' &&
      tableDefinitions[table].readable.includes(req.query.order)
        ? req.query.order
        : null;
    if (orderColumn) {
      sql += ` ORDER BY ${quoteIdentifier(orderColumn)} ${
        req.query.ascending === 'true' ? 'ASC' : 'DESC'
      }`;
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    sql += ` LIMIT ${limit} OFFSET ${offset}`;

    const result = await pool.query(sql, where.values);
    res.json({ data: result.rows });
  } catch (error) {
    sendError(res, error);
  }
});

dataRouter.post(
  '/:table',
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    try {
      const tableParameter = Array.isArray(req.params.table)
        ? req.params.table[0]
        : req.params.table;
      if (!isTableName(tableParameter)) {
        res.status(404).json({ error: { message: 'Unknown data resource', code: 'NOT_FOUND' } });
        return;
      }
      const table = tableParameter;
      const body = mutationSchema.parse(req.body);
      const scoped = enforceMutationScope(
        req,
        table,
        body.operation,
        body.values ?? {},
        body.filters,
      );
      const values = sanitizeValues(table, scoped.values);

      if (body.operation === 'insert') {
        if (table === 'books') values.user_id = req.authUser!.id;
        if (table === 'followers') values.follower_id = req.authUser!.id;
        if (table === 'wishlist') values.user_id = req.authUser!.id;
        if (table === 'messages') values.sender_id = req.authUser!.id;
        if (table === 'shared_books') values.sender_id = req.authUser!.id;
        const entries = Object.entries(values);
        if (!entries.length) throw Object.assign(new Error('No valid values supplied'), { statusCode: 400 });
        const sql = `INSERT INTO ${quoteIdentifier(table)}
          (${entries.map(([key]) => quoteIdentifier(key)).join(', ')})
          VALUES (${entries.map((_, index) => `$${index + 1}`).join(', ')})
          RETURNING ${tableDefinitions[table].readable.map(quoteIdentifier).join(', ')}`;
        const result = await pool.query(sql, entries.map(([, value]) => value));
        const inserted = result.rows[0];
        broadcast({ table, eventType: 'INSERT', new: inserted, old: null });
        res.status(201).json({ data: inserted ? [inserted] : [] });
        return;
      }

      if (!scoped.filters.length) {
        throw Object.assign(new Error('A mutation filter is required'), { statusCode: 400 });
      }
      const where = buildWhereClause(
        table,
        scoped.filters,
        body.operation === 'update' ? Object.keys(values).length + 1 : 1,
      );

      if (body.operation === 'update') {
        const entries = Object.entries(values);
        if (!entries.length) throw Object.assign(new Error('No valid values supplied'), { statusCode: 400 });
        const sql = `UPDATE ${quoteIdentifier(table)}
          SET ${entries
            .map(([key], index) => `${quoteIdentifier(key)} = $${index + 1}`)
            .join(', ')}
          ${where.sql}
          RETURNING ${tableDefinitions[table].readable.map(quoteIdentifier).join(', ')}`;
        const result = await pool.query(sql, [
          ...entries.map(([, value]) => value),
          ...where.values,
        ]);
        result.rows.forEach((row) =>
          broadcast({ table, eventType: 'UPDATE', new: row, old: null }),
        );
        res.json({ data: result.rows });
        return;
      }

      const sql = `DELETE FROM ${quoteIdentifier(table)}${where.sql}
        RETURNING ${tableDefinitions[table].readable.map(quoteIdentifier).join(', ')}`;
      const result = await pool.query(sql, where.values);
      result.rows.forEach((row) =>
        broadcast({ table, eventType: 'DELETE', new: null, old: row }),
      );
      res.json({ data: result.rows });
    } catch (error) {
      sendError(res, error);
    }
  },
);
