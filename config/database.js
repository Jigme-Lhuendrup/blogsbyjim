const pgp = require('pg-promise')();
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');

const cn = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

const db = pgp(cn);

// Test the connection
db.connect()
    .then(obj => {
        console.log('Database connection successful');
        obj.done(); // success, release the connection;
    })
    .catch(error => {
        console.log('ERROR:', error.message || error);
    });

// Function to run migrations
async function runMigration(filename) {
    try {
        const filePath = path.join(__dirname, '..', 'migrations', filename);
        const sql = await fs.readFile(filePath, 'utf8');
        await db.none(sql);
        console.log(`Migration ${filename} completed successfully`);
    } catch (error) {
        console.error(`Error running migration ${filename}:`, error);
        throw error;
    }
}

// Export database instance and utilities
module.exports = {
    ...db,
    runMigration
}; 