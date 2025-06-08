const pgp = require('pg-promise')();
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');

// Use DATABASE_URL if available (for Render), otherwise fall back to individual variables
<<<<<<< HEAD
const cn = process.env.DATABASE_URL 
    ? process.env.DATABASE_URL 
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
=======
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
>>>>>>> eaf59b791d790858428031266ed7f27235d6a72c
    };

const db = pgp(connectionConfig);

// Enhanced connection test with retry logic
async function testConnection(retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const obj = await db.connect();
            console.log('Database connection successful');
<<<<<<< HEAD
            obj.done();
=======
            obj.done(); // success, release the connection
>>>>>>> eaf59b791d790858428031266ed7f27235d6a72c
            return true;
        } catch (error) {
            console.error(`Connection attempt ${i + 1} failed:`, error.message);
            if (i < retries - 1) {
                await new Promise(res => setTimeout(res, delay));
                delay *= 2; // Exponential backoff
            }
        }
    }
<<<<<<< HEAD
    throw new Error('Failed to establish database connection after multiple attempts');
}

=======
    throw new Error('Failed to establish database connection after retries');
}

// Immediately test connection (optional)
testConnection().catch(error => {
    console.error('FATAL: Database connection failed:', error.message);
    process.exit(1); // Exit if database is critical
});

>>>>>>> eaf59b791d790858428031266ed7f27235d6a72c
// Function to run migrations with transaction support
async function runMigration(filename) {
    let tx = null;
    try {
        const filePath = path.join(__dirname, '..', 'migrations', filename);
        const sql = await fs.readFile(filePath, 'utf8');
        
<<<<<<< HEAD
        tx = await db.tx(); // Start transaction
        await tx.none(sql);
        await tx.commit();
        
        console.log(`Migration ${filename} completed successfully`);
        return true;
=======
        await db.tx(async t => {
            await t.none(sql);
            console.log(`Migration ${filename} completed successfully`);
        });
>>>>>>> eaf59b791d790858428031266ed7f27235d6a72c
    } catch (error) {
        if (tx) await tx.rollback();
        console.error(`Error running migration ${filename}:`, error);
        throw error;
    }
}

// Health check function
async function checkDatabaseHealth() {
    try {
        await db.one('SELECT 1');
        return true;
    } catch (error) {
        console.error('Database health check failed:', error);
        return false;
    }
}

// Export database instance and utilities
module.exports = {
<<<<<<< HEAD
    db,
    runMigration,
    testConnection,
    checkDatabaseHealth,
    pgp
};
=======
    db, // Main database instance
    pgp, // pg-promise instance
    runMigration,
    testConnection
};
>>>>>>> eaf59b791d790858428031266ed7f27235d6a72c
