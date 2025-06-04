const db = require('../config/database');
const bcrypt = require('bcrypt');

async function setupAdmin() {
    try {
        // The main migrate.js script should handle running all migrations.
        // We'll focus this script on ensuring the admin user's password and flags are set.

        // Create/Update admin user
        const adminPassword = 'admin123'; // You can change this password
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

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

        console.log('Admin setup completed successfully');
        console.log('Admin credentials:');
        console.log('Email: admin@blogsbyjim.com');
        console.log('Password: ' + adminPassword);
        process.exit(0);
    } catch (error) {
        console.error('Error setting up admin:', error);
        process.exit(1);
    }
}

setupAdmin(); 