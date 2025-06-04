const bcrypt = require('bcrypt');
const db = require('../config/database');

async function createAdminUser() {
    try {
        // Hash the admin password
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create or update admin user
        await db.none(`
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
                $1,
                TRUE,
                TRUE,
                CURRENT_TIMESTAMP
            ) ON CONFLICT (email) DO UPDATE 
            SET password = $1,
                is_admin = TRUE,
                is_verified = TRUE
        `, [hashedPassword]);

        console.log('Admin user created/updated successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
}

createAdminUser(); 