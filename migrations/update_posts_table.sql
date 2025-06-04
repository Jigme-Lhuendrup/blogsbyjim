-- Remove image_url column from posts table
ALTER TABLE posts DROP COLUMN IF EXISTS image_url; 