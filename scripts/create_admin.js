const bcrypt = require('bcrypt');
const db = require('../config/database');

async function createAdmin() {
    try {
        const adminPassword = 'admin123'; // You can change this password
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Create admin user
        await db.none(`
            INSERT INTO users (
                email,
                username,
                password,
                is_admin,
                is_verified
            ) VALUES (
                'admin@blogsbyjim.com',
                'admin',
                $1,
                TRUE,
                TRUE
            ) ON CONFLICT (email) 
            DO UPDATE SET 
                password = $1,
                is_admin = TRUE,
                is_verified = TRUE
        `, [hashedPassword]);

        console.log('Admin user created/updated successfully');
        console.log('Email: admin@blogsbyjim.com');
        console.log('Password: ' + adminPassword);
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
}

createAdmin(); 