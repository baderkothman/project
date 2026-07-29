INSERT INTO users (id, email, password_hash)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'demo@bookexchange.local', crypt('DemoPass123!', gen_salt('bf', 12))),
  ('22222222-2222-4222-8222-222222222222', 'layla@bookexchange.local', crypt('DemoPass123!', gen_salt('bf', 12))),
  ('33333333-3333-4333-8333-333333333333', 'omar@bookexchange.local', crypt('DemoPass123!', gen_salt('bf', 12)))
ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (
  id, username, first_name, last_name, bio, avatar_url, books_read, books_exchanged
)
VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'demo_reader',
    'Demo',
    'Reader',
    'Building a thoughtful shelf, one exchange at a time.',
    'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?w=400&q=80',
    18,
    4
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'layla_reads',
    'Layla',
    'Hassan',
    'Contemporary fiction, essays, and beautifully annotated margins.',
    'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?w=400&q=80',
    42,
    11
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'omar_library',
    'Omar',
    'Saleh',
    'History and science books looking for their next reader.',
    'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?w=400&q=80',
    31,
    8
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO books (
  id, user_id, title, author, description, category, language, condition,
  price, pages, isbn, location, images, created_at
)
VALUES
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '22222222-2222-4222-8222-222222222222',
    'The Midnight Library',
    'Matt Haig',
    'A gently used copy with a clean cover and no marked pages.',
    'Fiction',
    'en',
    'Very Good',
    8.50,
    304,
    '9780525559474',
    'Riyadh',
    ARRAY['https://images-na.ssl-images-amazon.com/images/P/0525559477.01.L.jpg'],
    now() - interval '3 hours'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    '33333333-3333-4333-8333-333333333333',
    'Sapiens',
    'Yuval Noah Harari',
    'Paperback edition. Light shelf wear; the inside is in excellent condition.',
    'History',
    'en',
    'Good',
    10.00,
    464,
    '9780062316097',
    'Riyadh',
    ARRAY['https://images-na.ssl-images-amazon.com/images/P/0062316095.01.L.jpg'],
    now() - interval '1 day'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    '11111111-1111-4111-8111-111111111111',
    'Atomic Habits',
    'James Clear',
    'Hardcover copy with a few highlighted passages.',
    'Non-fiction',
    'en',
    'Good',
    12.00,
    320,
    '9780735211292',
    'Riyadh',
    ARRAY['https://images-na.ssl-images-amazon.com/images/P/0735211299.01.L.jpg'],
    now() - interval '2 days'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO followers (follower_id, following_id)
VALUES
  ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'),
  ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333'),
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111')
ON CONFLICT (follower_id, following_id) DO NOTHING;

INSERT INTO messages (id, sender_id, recipient_id, content, read, created_at)
VALUES
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    'Would you like to exchange The Midnight Library this weekend?',
    false,
    now() - interval '40 minutes'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333333',
    'Is Sapiens still available?',
    true,
    now() - interval '2 hours'
  )
ON CONFLICT (id) DO NOTHING;

UPDATE profiles p
SET
  library_count = (SELECT count(*) FROM books b WHERE b.user_id = p.id),
  wishlist_count = (SELECT count(*) FROM wishlist w WHERE w.user_id = p.id);

