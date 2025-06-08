-- Update posts table schema
ALTER TABLE posts DROP COLUMN IF EXISTS image_url;

-- Ensure created_at and updated_at columns exist with correct types
ALTER TABLE posts 
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN created_at SET NOT NULL;

-- Add updated_at column if it doesn't exist
ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP; 