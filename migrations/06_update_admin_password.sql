-- Update admin password to 'admin123'
UPDATE users 
SET password = '$2b$10$rKN3VkKHoKcxQS0FU3y6/.Qr8jxcjWtc5g9h5Y5XwR8XH5wF.ZXZW'
WHERE email = 'admin@blogsbyjim.com';

-- Ensure admin user exists with correct settings
INSERT INTO users (
    email,
    username,
    password,
    is_admin,
    is_verified,
    created_at
) VALUES (
    'admin@blogsbyjim.com',
    'admin',
    '$2b$10$rKN3VkKHoKcxQS0FU3y6/.Qr8jxcjWtc5g9h5Y5XwR8XH5wF.ZXZW',
    TRUE,
    TRUE,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE 
SET is_admin = TRUE,
    is_verified = TRUE; 