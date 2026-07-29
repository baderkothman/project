CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  email_confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  birthdate date,
  bio text NOT NULL DEFAULT '',
  avatar_url text,
  search_history text[] NOT NULL DEFAULT '{}',
  books_read integer NOT NULL DEFAULT 0 CHECK (books_read >= 0),
  books_exchanged integer NOT NULL DEFAULT 0 CHECK (books_exchanged >= 0),
  library_count integer NOT NULL DEFAULT 0 CHECK (library_count >= 0),
  wishlist_count integer NOT NULL DEFAULT 0 CHECK (wishlist_count >= 0),
  history_count integer NOT NULL DEFAULT 0 CHECK (history_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  author text NOT NULL CHECK (char_length(author) BETWEEN 1 AND 160),
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Other',
  language text NOT NULL DEFAULT 'en',
  condition text NOT NULL DEFAULT 'Good',
  price numeric(10, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  pages integer CHECK (pages IS NULL OR pages > 0),
  isbn text,
  location text,
  images text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT followers_not_self CHECK (follower_id <> following_id),
  CONSTRAINT followers_unique UNIQUE (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id uuid REFERENCES books(id) ON DELETE CASCADE,
  google_books_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wishlist_has_book CHECK (
    (book_id IS NOT NULL AND google_books_id IS NULL)
    OR (book_id IS NULL AND google_books_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS wishlist_local_unique
  ON wishlist (user_id, book_id) WHERE book_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS wishlist_google_unique
  ON wishlist (user_id, google_books_id) WHERE google_books_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id text NOT NULL,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  image text,
  preview_link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS books_user_created_idx ON books (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_sender_recipient_idx
  ON messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_recipient_unread_idx
  ON messages (recipient_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS shared_books_participants_idx
  ON shared_books (sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS profiles_username_search_idx
  ON profiles (lower(username) text_pattern_ops);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS books_set_updated_at ON books;
CREATE TRIGGER books_set_updated_at
BEFORE UPDATE ON books FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION refresh_profile_counters()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  affected_user uuid;
BEGIN
  affected_user := COALESCE(NEW.user_id, OLD.user_id);
  UPDATE profiles
  SET
    library_count = (SELECT count(*) FROM books WHERE user_id = affected_user),
    wishlist_count = (SELECT count(*) FROM wishlist WHERE user_id = affected_user)
  WHERE id = affected_user;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS books_refresh_profile_counter ON books;
CREATE TRIGGER books_refresh_profile_counter
AFTER INSERT OR DELETE ON books FOR EACH ROW EXECUTE FUNCTION refresh_profile_counters();

DROP TRIGGER IF EXISTS wishlist_refresh_profile_counter ON wishlist;
CREATE TRIGGER wishlist_refresh_profile_counter
AFTER INSERT OR DELETE ON wishlist FOR EACH ROW EXECUTE FUNCTION refresh_profile_counters();

