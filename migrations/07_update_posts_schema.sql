-- Update posts table schema
ALTER TABLE posts DROP COLUMN IF EXISTS image_url;

-- Ensure created_at and updated_at columns exist with correct types
ALTER TABLE posts 
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN created_at SET NOT NULL;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'posts' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE posts ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$; 