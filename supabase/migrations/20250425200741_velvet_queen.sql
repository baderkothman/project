/*
  # Add follower profile functions

  1. New Functions
    - `get_follower_profiles`
      - Returns profiles of users who follow a given user
    - `get_following_profiles`
      - Returns profiles of users followed by a given user
    - `get_follower_count`
      - Returns count of followers for a user
    - `get_following_count`
      - Returns count of users followed by a user

  2. Security
    - Functions run with SECURITY DEFINER
    - Execute permission granted only to authenticated users
*/

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS get_follower_profiles(uuid);
DROP FUNCTION IF EXISTS get_following_profiles(uuid);
DROP FUNCTION IF EXISTS get_follower_count(uuid);
DROP FUNCTION IF EXISTS get_following_count(uuid);

-- Function to get follower profiles
CREATE FUNCTION get_follower_profiles(uid uuid)
RETURNS TABLE (
  id uuid,
  username text,
  avatar_url text,
  first_name text,
  last_name text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.avatar_url,
    p.first_name,
    p.last_name,
    f.created_at
  FROM followers f
  JOIN profiles p ON f.follower_id = p.id
  WHERE f.following_id = uid
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get following profiles
CREATE FUNCTION get_following_profiles(uid uuid)
RETURNS TABLE (
  id uuid,
  username text,
  avatar_url text,
  first_name text,
  last_name text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.avatar_url,
    p.first_name,
    p.last_name,
    f.created_at
  FROM followers f
  JOIN profiles p ON f.following_id = p.id
  WHERE f.follower_id = uid
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get follower count
CREATE FUNCTION get_follower_count(uid uuid)
RETURNS bigint AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM followers
    WHERE following_id = uid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get following count
CREATE FUNCTION get_following_count(uid uuid)
RETURNS bigint AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM followers
    WHERE follower_id = uid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_follower_profiles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_following_profiles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_follower_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_following_count(uuid) TO authenticated;