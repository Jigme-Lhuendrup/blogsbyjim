const fs = require('fs').promises;
const path = require('path');
const db = require('../config/database');

async function runMigration() {
    const migrationsDir = path.join(__dirname, '../migrations');
    try {
        const files = await fs.readdir(migrationsDir);
        const sqlFiles = files
            .filter(file => file.endsWith('.sql'))
            .sort(); // Sort to ensure order, e.g., 01_, 02_

        if (sqlFiles.length === 0) {
            console.log('No migration files found.');
            process.exit(0);
            return;
        }

        console.log(`Found ${sqlFiles.length} migration(s):`);
        for (const file of sqlFiles) {
            console.log(`- ${file}`);
        }

        for (const file of sqlFiles) {
            console.log(`Running migration ${file}...`);
            const filePath = path.join(migrationsDir, file);
            const sql = await fs.readFile(filePath, 'utf8');
            await db.none(sql);
            console.log(`Migration ${file} completed successfully.`);
        }
        
        console.log('All migrations completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration(); 