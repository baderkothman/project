import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from './auth';
import { pool } from './db';
import type { AuthenticatedRequest } from './types';

export const rpcRouter = Router();
rpcRouter.use(requireAuth);

const userIdSchema = z.string().uuid();

rpcRouter.post('/:name', async (req: AuthenticatedRequest, res) => {
  try {
    const name = req.params.name;
    const params = (req.body ?? {}) as Record<string, unknown>;
    const currentUserId = req.authUser!.id;

    if (name === 'get_follower_count' || name === 'get_following_count') {
      const userId = userIdSchema.parse(params.uid ?? currentUserId);
      const column = name === 'get_follower_count' ? 'following_id' : 'follower_id';
      const result = await pool.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM followers WHERE ${column} = $1`,
        [userId],
      );
      res.json({ data: result.rows[0]?.count ?? 0 });
      return;
    }

    if (name === 'get_following_profiles' || name === 'get_follower_profiles') {
      const userId = userIdSchema.parse(params.uid ?? currentUserId);
      const joinColumn =
        name === 'get_following_profiles' ? 'following_id' : 'follower_id';
      const filterColumn =
        name === 'get_following_profiles' ? 'follower_id' : 'following_id';
      const result = await pool.query(
        `SELECT p.id, p.username, p.avatar_url, p.first_name, p.last_name, p.bio
         FROM followers f
         JOIN profiles p ON p.id = f.${joinColumn}
         WHERE f.${filterColumn} = $1
         ORDER BY p.username ASC`,
        [userId],
      );
      res.json({ data: result.rows });
      return;
    }

    if (name === 'get_recent_chats') {
      const result = await pool.query(
        `WITH conversation_messages AS (
           SELECT
             m.*,
             CASE WHEN m.sender_id = $1 THEN m.recipient_id ELSE m.sender_id END AS other_user_id
           FROM messages m
           WHERE m.sender_id = $1 OR m.recipient_id = $1
         ),
         latest AS (
           SELECT DISTINCT ON (other_user_id)
             other_user_id, content, created_at
           FROM conversation_messages
           ORDER BY other_user_id, created_at DESC
         )
         SELECT
           l.other_user_id AS id,
           l.other_user_id,
           p.username,
           p.avatar_url,
           p.first_name,
           p.last_name,
           l.content,
           l.created_at,
           (
             SELECT count(*)::int
             FROM messages unread
             WHERE unread.sender_id = l.other_user_id
               AND unread.recipient_id = $1
               AND unread.read = false
           ) AS unread_count
         FROM latest l
         JOIN profiles p ON p.id = l.other_user_id
         ORDER BY l.created_at DESC`,
        [currentUserId],
      );
      res.json({ data: result.rows });
      return;
    }

    if (name === 'get_chat_items') {
      const otherUserId = userIdSchema.parse(params.other_user_id);
      const requestedUserId = userIdSchema.parse(params.chat_user_id ?? currentUserId);
      if (requestedUserId !== currentUserId) {
        res.status(403).json({ error: { message: 'Conversation access denied', code: 'FORBIDDEN' } });
        return;
      }
      const pageSize = Math.min(Math.max(Number(params.page_size) || 50, 1), 100);
      const lastTimestamp =
        typeof params.last_timestamp === 'string' ? params.last_timestamp : null;
      const result = await pool.query(
        `WITH chat_items AS (
           SELECT
             m.id,
             m.content,
             m.sender_id,
             m.recipient_id,
             m.created_at,
             'message'::text AS item_type,
             NULL::jsonb AS book_data
           FROM messages m
           WHERE ((m.sender_id = $1 AND m.recipient_id = $2)
              OR (m.sender_id = $2 AND m.recipient_id = $1))
             AND ($3::timestamptz IS NULL OR m.created_at < $3)
           UNION ALL
           SELECT
             s.id,
             ''::text AS content,
             s.sender_id,
             s.recipient_id,
             s.created_at,
             'shared_book'::text AS item_type,
             jsonb_build_object(
               'book_id', s.book_id,
               'title', s.title,
               'image', COALESCE(s.image, ''),
               'preview_link', COALESCE(s.preview_link, '')
             ) AS book_data
           FROM shared_books s
           WHERE ((s.sender_id = $1 AND s.recipient_id = $2)
              OR (s.sender_id = $2 AND s.recipient_id = $1))
             AND ($3::timestamptz IS NULL OR s.created_at < $3)
         ),
         page AS (
           SELECT * FROM chat_items ORDER BY created_at DESC LIMIT $4
         )
         SELECT * FROM page ORDER BY created_at ASC`,
        [currentUserId, otherUserId, lastTimestamp, pageSize],
      );
      res.json({ data: result.rows });
      return;
    }

    res.status(404).json({ error: { message: `Unknown operation: ${name}`, code: 'NOT_FOUND' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'RPC request failed';
    res.status(400).json({ error: { message, code: 'INVALID_REQUEST' } });
  }
});

