const { db } = require('../config/database');

class Contact {
    static async create(email, comment) {
        try {
            const result = await db.one(
                `INSERT INTO contacts (email, comment, created_at)
                 VALUES ($1, $2, CURRENT_TIMESTAMP)
                 RETURNING id, email, comment, created_at`,
                [email, comment]
            );
            return result;
        } catch (error) {
            console.error('Error creating contact:', error);
            throw error;
        }
    }

    static async getAll() {
        try {
            return await db.any('SELECT * FROM contacts ORDER BY created_at DESC');
        } catch (error) {
            console.error('Error getting contacts:', error);
            throw error;
        }
    }

    static async getTotalCount() {
        try {
            const result = await db.one('SELECT COUNT(*) FROM contacts');
            return parseInt(result.count);
        } catch (error) {
            console.error('Error getting total contact count:', error);
            throw error;
        }
    }
}

module.exports = Contact;