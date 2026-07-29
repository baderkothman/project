import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const port = Number(process.env.API_PORT ?? 4000);
const isProduction = process.env.NODE_ENV === 'production';
const fallbackJwtSecret = 'local-development-only-change-me';
const jwtSecret = process.env.JWT_SECRET ?? fallbackJwtSecret;

if (isProduction && jwtSecret === fallbackJwtSecret) {
  throw new Error('JWT_SECRET must be configured in production');
}

export const config = {
  port,
  databaseUrl:
    process.env.DATABASE_URL ??
    `postgresql://${encodeURIComponent(process.env.USER ?? '')}@127.0.0.1:5432/book_exchange_local`,
  jwtSecret,
  tokenTtl: process.env.JWT_TTL ?? '7d',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:8081,http://127.0.0.1:8081')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  googleBooksApiKey: process.env.GOOGLE_BOOKS_API_KEY ?? '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeSuccessUrl: process.env.STRIPE_SUCCESS_URL ?? 'bookexchange://success',
  stripeCancelUrl: process.env.STRIPE_CANCEL_URL ?? 'bookexchange://cancel',
  uploadDirectory: path.resolve(process.cwd(), 'server/uploads'),
  publicApiUrl: process.env.PUBLIC_API_URL ?? `http://127.0.0.1:${port}`,
  isProduction,
} as const;
