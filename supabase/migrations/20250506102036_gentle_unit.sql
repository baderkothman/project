-- supabase/migrations/20250506102036_gentle_unit.sql

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_books_user_category ON books(user_id, category);
CREATE INDEX IF NOT EXISTS idx_books_price_created ON books(price, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_condition ON books(condition);

-- Create materialized view for frequently accessed data
CREATE MATERIALIZED VIEW IF NOT EXISTS book_summaries AS
SELECT 
  b.id,
  b.title,
  b.author,
  b.price,
  b.condition,
  b.images[1] as main_image,
  p.username as owner_username,
  p.avatar_url as owner_avatar
FROM books b
JOIN profiles p ON b.user_id = p.id;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS book_summaries_id ON book_summaries(id);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_book_summaries()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY book_summaries;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS refresh_book_summaries_trigger ON books;

-- Create trigger to refresh materialized view
CREATE TRIGGER refresh_book_summaries_trigger
AFTER INSERT OR UPDATE OR DELETE ON books
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_book_summaries();

-- Grant permissions
GRANT SELECT ON book_summaries TO authenticated;
