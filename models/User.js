const db = require('../config/database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

class User {
    static async createUser({ email, password, username, gender, dob }) {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            const result = await db.one(
                `INSERT INTO users (
                    email, password, username, gender, date_of_birth, 
                    verification_token, verification_expiry, created_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
                RETURNING id, email, username, gender, date_of_birth, verification_token`,
                [email, hashedPassword, username, gender, dob, verificationToken, verificationExpiry]
            );
            
            return result;
        } catch (error) {
            if (error.code === '23505') { // unique violation
                throw new Error('Email or username already exists');
            }
            throw error;
        }
    }

    static async findByEmail(email) {
        try {
            return await db.oneOrNone('SELECT id, email, username, password, is_verified, is_admin, profile_image_url FROM users WHERE email = $1', [email]);
        } catch (error) {
            throw error;
        }
    }

    static async findByUsername(username) {
        try {
            return await db.oneOrNone('SELECT * FROM users WHERE username = $1', [username]);
        } catch (error) {
            throw error;
        }
    }

    static async validatePassword(providedPassword, storedHash) {
        return await bcrypt.compare(providedPassword, storedHash);
    }

    static async verifyEmail(token) {
        try {
            const result = await db.oneOrNone(
                `UPDATE users 
                SET is_verified = TRUE, 
                    verification_token = NULL, 
                    verification_expiry = NULL
                WHERE verification_token = $1 
                AND verification_expiry > CURRENT_TIMESTAMP
                RETURNING id, email, username`,
                [token]
            );
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async resendVerification(userId) {
        try {
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

            const result = await db.one(
                `UPDATE users 
                SET verification_token = $1,
                    verification_expiry = $2
                WHERE id = $3
                RETURNING id, email, verification_token`,
                [verificationToken, verificationExpiry, userId]
            );
            return result;
        } catch (error) {
            throw error;
        }
    }

    static async findById(userId) {
        try {
            return await db.one(
                'SELECT id, email, username, gender, date_of_birth, profile_image_url, is_admin FROM users WHERE id = $1',
                [userId]
            );
        } catch (error) {
            throw error;
        }
    }

    static async update(userId, { username, email, gender, dateOfBirth }) {
        try {
            return await db.one(
                `UPDATE users 
                SET username = $1, email = $2, gender = $3, date_of_birth = $4
                WHERE id = $5
                RETURNING id, email, username, gender, date_of_birth`,
                [username, email, gender, dateOfBirth, userId]
            );
        } catch (error) {
            throw error;
        }
    }

    static async updateProfileImage(userId, imageUrl) {
        try {
            return await db.one(
                `UPDATE users 
                SET profile_image_url = $1
                WHERE id = $2
                RETURNING id, profile_image_url`,
                [imageUrl, userId]
            );
        } catch (error) {
            throw error;
        }
    }

    // Get total user count
    static async getTotalCount() {
        const result = await db.one('SELECT COUNT(*) FROM users');
        return parseInt(result.count);
    }

    // Get recent users
    static async getRecentUsers(limit = 10) {
        return await db.any(`
            SELECT id, username, email, profile_image_url, is_verified, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT $1
        `, [limit]);
    }

    // Delete user and their posts
    static async deleteUser(userId) {
        return await db.tx(async t => {
            // Delete user's posts first
            await t.none('DELETE FROM posts WHERE user_id = $1', [userId]);
            
            // Delete user's profile image if exists
            const user = await t.oneOrNone('SELECT profile_image_url FROM users WHERE id = $1', [userId]);
            if (user && user.profile_image_url) {
                const imagePath = path.join(__dirname, '../public', user.profile_image_url);
                fs.unlink(imagePath).catch(() => {});
            }
            
            // Delete the user
            await t.none('DELETE FROM users WHERE id = $1', [userId]);
        });
    }

    // Get new users this month
    static async getNewUsersThisMonth() {
        const result = await db.one(`
            SELECT COUNT(*) 
            FROM users 
            WHERE created_at >= date_trunc('month', CURRENT_DATE)
        `);
        return parseInt(result.count);
    }

    // Get active users today (placeholder - implement actual tracking later)
    static async getActiveUsersToday() {
        return 0; // TODO: Implement user activity tracking
    }

    // Update admin password
    static async updatePassword(userId, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        return await db.none(
            'UPDATE users SET password = $1 WHERE id = $2',
            [hashedPassword, userId]
        );
    }
}

module.exports = User; 