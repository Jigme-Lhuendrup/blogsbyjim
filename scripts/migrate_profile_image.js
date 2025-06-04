const db = require('../config/database');

async function runMigration() {
    try {
        // Add profile_image_url column
        await db.none(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(255)
        `);
        
        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration(); 