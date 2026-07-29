import type { NextFunction, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { config } from './config';
import { pool } from './db';
import type { AuthenticatedRequest, AuthUser } from './types';

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
});

export const signUpSchema = credentialsSchema.extend({
  metadata: z
    .object({
      first_name: z.string().trim().min(1).max(80),
      last_name: z.string().trim().min(1).max(80),
      birthdate: z.string().datetime().optional(),
    })
    .refine(
      ({ birthdate }) => {
        if (!birthdate) return true;
        const oldestAllowed = new Date();
        oldestAllowed.setFullYear(oldestAllowed.getFullYear() - 13);
        return new Date(birthdate) <= oldestAllowed;
      },
      { message: 'You must be at least 13 years old', path: ['birthdate'] },
    )
    .default({ first_name: 'Reader', last_name: 'User' }),
});

export function createToken(user: AuthUser) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: config.tokenTtl } as SignOptions,
  );
}

export function readBearerToken(req: AuthenticatedRequest) {
  const header = req.header('authorization');
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
}

export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) {
  const token = readBearerToken(req);
  if (!token) {
    next();
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    if (typeof payload.sub === 'string' && typeof payload.email === 'string') {
      req.authUser = { id: payload.sub, email: payload.email };
    }
  } catch {
    // Invalid optional credentials are treated as an anonymous request.
  }
  next();
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  optionalAuth(req, res, async () => {
    if (!req.authUser) {
      res.status(401).json({ error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
      return;
    }
    try {
      const result = await pool.query(
        'SELECT 1 FROM users WHERE id = $1 AND lower(email) = lower($2)',
        [req.authUser.id, req.authUser.email],
      );
      if (result.rowCount === 0) {
        res.status(401).json({
          error: { message: 'Session is no longer valid', code: 'INVALID_SESSION' },
        });
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  });
}

export async function verifyCredentials(email: string, password: string) {
  const result = await pool.query<{
    id: string;
    email: string;
    password_hash: string;
    email_confirmed_at: string;
  }>(
    `SELECT id, email, password_hash, email_confirmed_at
     FROM users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email],
  );

  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return null;
  }
  return user;
}

export function sanitizeUsername(email: string) {
  const base = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 22);
  return `${base || 'reader'}_${Math.random().toString(36).slice(2, 6)}`;
}
