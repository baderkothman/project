import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import Stripe from 'stripe';
import { z } from 'zod';
import { config } from './config';
import { checkDatabaseConnection, pool } from './db';
import {
  createToken,
  credentialsSchema,
  optionalAuth,
  requireAuth,
  sanitizeUsername,
  signUpSchema,
  verifyCredentials,
} from './auth';
import { dataRouter } from './data-router';
import { rpcRouter } from './rpc-router';
import { attachRealtimeServer } from './realtime';
import type { AuthenticatedRequest } from './types';

const app = express();
const server = http.createServer(app);
const stripe = config.stripeSecretKey
  ? new Stripe(config.stripeSecretKey)
  : null;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    callback(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype));
  },
});

app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  }),
);
app.use(
  cors({
    credentials: false,
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin is not allowed'));
    },
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 180,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
);
app.use('/uploads', express.static(config.uploadDirectory, { maxAge: '1h', fallthrough: false }));

app.get('/health', async (_req, res) => {
  try {
    const database = await checkDatabaseConnection();
    res.json({ status: 'ok', database: database.database });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

app.post(
  '/api/auth/login',
  rateLimit({ windowMs: 15 * 60_000, limit: 20 }),
  async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: 'Enter a valid email and password', code: 'INVALID_CREDENTIALS' } });
      return;
    }
    const user = await verifyCredentials(parsed.data.email, parsed.data.password);
    if (!user) {
      res.status(401).json({ error: { message: 'Email or password is incorrect', code: 'INVALID_CREDENTIALS' } });
      return;
    }
    const authUser = {
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      user_metadata: {},
    };
    res.json({
      data: {
        user: authUser,
        session: { access_token: createToken(authUser), user: authUser },
      },
    });
  },
);

app.post(
  '/api/auth/signup',
  rateLimit({ windowMs: 60 * 60_000, limit: 10 }),
  async (req, res) => {
    const parsed = signUpSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { message: 'Please check the registration fields', code: 'INVALID_SIGNUP' } });
      return;
    }
    const { email, password, metadata } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 12);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const userResult = await client.query<{ id: string; email: string; email_confirmed_at: string }>(
        `INSERT INTO users (email, password_hash)
         VALUES ($1, $2)
         RETURNING id, email, email_confirmed_at`,
        [email, passwordHash],
      );
      const user = userResult.rows[0];
      await client.query(
        `INSERT INTO profiles (id, username, first_name, last_name, birthdate)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user.id,
          sanitizeUsername(email),
          metadata.first_name,
          metadata.last_name,
          metadata.birthdate ?? null,
        ],
      );
      await client.query('COMMIT');
      const authUser = {
        ...user,
        user_metadata: {
          first_name: metadata.first_name,
          last_name: metadata.last_name,
        },
      };
      res.status(201).json({
        data: {
          user: authUser,
          session: { access_token: createToken(authUser), user: authUser },
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      const duplicate =
        typeof error === 'object' && error && 'code' in error && error.code === '23505';
      res.status(duplicate ? 409 : 500).json({
        error: {
          message: duplicate ? 'An account with this email already exists' : 'Account creation failed',
          code: duplicate ? 'ACCOUNT_EXISTS' : 'SIGNUP_FAILED',
        },
      });
    } finally {
      client.release();
    }
  },
);

app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const result = await pool.query<{ id: string; email: string; email_confirmed_at: string }>(
    'SELECT id, email, email_confirmed_at FROM users WHERE id = $1',
    [req.authUser!.id],
  );
  const user = result.rows[0];
  if (!user) {
    res.status(401).json({ error: { message: 'Session is no longer valid', code: 'INVALID_SESSION' } });
    return;
  }
  res.json({ data: { user: { ...user, user_metadata: {} } } });
});

app.patch('/api/auth/password', requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ password: z.string().min(8).max(128) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { message: 'Password must be between 8 and 128 characters', code: 'INVALID_PASSWORD' } });
    return;
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
    passwordHash,
    req.authUser!.id,
  ]);
  res.json({ data: { user: req.authUser } });
});

app.delete('/api/auth/account', requireAuth, async (req: AuthenticatedRequest, res) => {
  await pool.query('DELETE FROM users WHERE id = $1', [req.authUser!.id]);
  res.status(204).end();
});

app.post('/api/payments/checkout', requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!stripe) {
    res.status(503).json({
      error: {
        message: 'Payments are disabled in local development. Add STRIPE_SECRET_KEY to .env.local to enable them.',
        code: 'PAYMENTS_NOT_CONFIGURED',
      },
    });
    return;
  }
  const parsed = z
    .object({
      price_id: z.string().regex(/^price_[A-Za-z0-9]+$/),
      mode: z.enum(['payment', 'subscription']),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { message: 'Invalid checkout request', code: 'INVALID_CHECKOUT' } });
    return;
  }
  const checkout = await stripe.checkout.sessions.create({
    customer_email: req.authUser!.email,
    line_items: [{ price: parsed.data.price_id, quantity: 1 }],
    mode: parsed.data.mode,
    success_url: config.stripeSuccessUrl,
    cancel_url: config.stripeCancelUrl,
  });
  res.status(201).json({ url: checkout.url });
});

app.post(
  '/api/uploads/:bucket',
  requireAuth,
  upload.single('file'),
  async (req: AuthenticatedRequest, res) => {
    const bucket = Array.isArray(req.params.bucket)
      ? req.params.bucket[0]
      : req.params.bucket;
    if (!['avatars', 'books'].includes(bucket) || !req.file) {
      res.status(400).json({ error: { message: 'A valid image upload is required', code: 'INVALID_UPLOAD' } });
      return;
    }
    const extension =
      req.file.mimetype === 'image/png'
        ? 'png'
        : req.file.mimetype === 'image/webp'
          ? 'webp'
          : 'jpg';
    const safeName = `${req.authUser!.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;
    const absolutePath = path.join(config.uploadDirectory, bucket, safeName);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, req.file.buffer, { mode: 0o600 });
    res.status(201).json({
      data: { publicUrl: `${config.publicApiUrl}/uploads/${bucket}/${safeName}` },
    });
  },
);

app.get('/api/google-books/search', optionalAuth, async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!query) {
    res.status(400).json({ error: { message: 'A search query is required', code: 'INVALID_QUERY' } });
    return;
  }
  const url = new URL('https://www.googleapis.com/books/v1/volumes');
  url.searchParams.set('q', query);
  url.searchParams.set('maxResults', String(Math.min(Number(req.query.maxResults) || 20, 40)));
  if (typeof req.query.filter === 'string') url.searchParams.set('filter', req.query.filter);
  if (
    typeof req.query.orderBy === 'string' &&
    ['relevance', 'newest'].includes(req.query.orderBy)
  ) {
    url.searchParams.set('orderBy', req.query.orderBy);
  }
  if (config.googleBooksApiKey) url.searchParams.set('key', config.googleBooksApiKey);
  const response = await fetch(url);
  res.status(response.status).json(await response.json());
});

app.get('/api/google-books/:id', optionalAuth, async (req, res) => {
  const bookId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const url = new URL(
    `https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(bookId)}`,
  );
  if (config.googleBooksApiKey) url.searchParams.set('key', config.googleBooksApiKey);
  const response = await fetch(url);
  res.status(response.status).json(await response.json());
});

app.use('/api/data', dataRouter);
app.use('/api/rpc', rpcRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } });
});

async function start() {
  await fs.mkdir(config.uploadDirectory, { recursive: true });
  const database = await checkDatabaseConnection();
  attachRealtimeServer(server);
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`Local API listening at ${config.publicApiUrl}`);
    console.log(`Connected to PostgreSQL database ${database.database}`);
  });
}

start().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

process.on('SIGTERM', async () => {
  server.close();
  await pool.end();
});
