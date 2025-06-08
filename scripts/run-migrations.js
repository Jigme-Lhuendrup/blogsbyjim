const { db } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

async function runMigrations() {
    try {
        // Get all migration files
        const migrationsDir = path.join(__dirname, '..', 'migrations');
        const files = await fs.readdir(migrationsDir);
        
        // Sort files to ensure correct order
        const migrationFiles = files
            .filter(f => f.endsWith('.sql'))
            .sort();

        console.log('Starting database migrations...');

        // Run each migration in a transaction
        for (const file of migrationFiles) {
            console.log(`Running migration: ${file}`);
            const filePath = path.join(migrationsDir, file);
            const sql = await fs.readFile(filePath, 'utf8');
            
            try {
                // Split the SQL file into individual statements
                const statements = sql
                    .split(';')
                    .map(statement => statement.trim())
                    .filter(statement => statement.length > 0);

                // Execute each statement separately
                for (const statement of statements) {
                    await db.none(statement + ';');
                }
                
                console.log(`Completed migration: ${file}`);
            } catch (error) {
                console.error(`Error in migration ${file}:`, error);
                throw error;
            }
        }

        console.log('All migrations completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigrations(); 