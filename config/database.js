const pgp = require('pg-promise')();
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');

// Use DATABASE_URL if available (for Render), otherwise fall back to individual variables
const connectionConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } // Required for Render's PostgreSQL
    }
  : {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

const db = pgp(connectionConfig);

// Enhanced connection test with retry logic
async function testConnection(retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const obj = await db.connect();
            console.log('Database connection successful');
            obj.done(); // success, release the connection
            return true;
        } catch (error) {
            console.error(`Connection attempt ${i + 1} failed:`, error.message);
            if (i < retries - 1) {
                await new Promise(res => setTimeout(res, delay));
                delay *= 2; // Exponential backoff
            }
        }
    }
    throw new Error('Failed to establish database connection after retries');
}

// Immediately test connection (optional)
testConnection().catch(error => {
    console.error('FATAL: Database connection failed:', error.message);
    process.exit(1); // Exit if database is critical
});

// Function to run migrations with transaction support
async function runMigration(filename) {
    try {
        const filePath = path.join(__dirname, '..', 'migrations', filename);
        const sql = await fs.readFile(filePath, 'utf8');
        
        await db.tx(async t => {
            await t.none(sql);
            console.log(`Migration ${filename} completed successfully`);
        });
    } catch (error) {
        console.error(`Error running migration ${filename}:`, error);
        throw error;
    }
}

// Export database instance and utilities
module.exports = {
    db, // Main database instance
    pgp, // pg-promise instance
    runMigration,
    testConnection
};
