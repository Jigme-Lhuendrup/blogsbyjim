-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create admin user
INSERT INTO users (
    email, 
    username, 
    password, 
    is_admin, 
    is_verified
) VALUES (
    'admin@blogsbyjim.com',
    'admin',
    '$2b$10$YourHashedPasswordHere', -- We'll update this with actual hashed password
    TRUE,
    TRUE
) ON CONFLICT (email) DO NOTHING; 