const db = require('../config/database');

class Post {
    static async create({ userId, title, content }) {
        try {
            return await db.one(
                `INSERT INTO posts (user_id, title, content)
                VALUES ($1, $2, $3)
                RETURNING *`,
                [userId, title, content]
            );
        } catch (error) {
            throw error;
        }
    }

    static async getAllPostsWithAuthorInfo() {
        try {
            return await db.any(
                `SELECT 
                    p.*,
                    u.username,
                    u.profile_image_url as author_image
                FROM posts p
                LEFT JOIN users u ON p.user_id = u.id
                ORDER BY p.created_at DESC`
            );
        } catch (error) {
            throw error;
        }
    }

    static async getPostWithAuthorInfo(postId) {
        try {
            const post = await db.oneOrNone(
                `SELECT 
                    p.*,
                    u.username,
                    u.profile_image_url as author_image
                FROM posts p
                LEFT JOIN users u ON p.user_id = u.id
                WHERE p.id = $1`,
                [postId]
            );

            if (!post) {
                console.log('Post not found:', postId);
                return null;
            }

            console.log('Retrieved post:', post); // Debug log
            return post;
        } catch (error) {
            console.error('Error in getPostWithAuthorInfo:', error);
            throw error;
        }
    }

    static async update({ postId, userId, title, content }) {
        try {
            return await db.one(
                `UPDATE posts 
                SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3 AND user_id = $4
                RETURNING *`,
                [title, content, postId, userId]
            );
        } catch (error) {
            throw error;
        }
    }

    static async delete(postId, userId) {
        try {
            return await db.result(
                'DELETE FROM posts WHERE id = $1 AND user_id = $2',
                [postId, userId]
            );
        } catch (error) {
            throw error;
        }
    }

    static async getPostCountByUserId(userId) {
        try {
            const result = await db.one(
                'SELECT COUNT(*) as count FROM posts WHERE user_id = $1',
                [userId]
            );
            return parseInt(result.count);
        } catch (error) {
            throw error;
        }
    }

    // Get total post count
    static async getTotalCount() {
        const result = await db.one('SELECT COUNT(*) FROM posts');
        return parseInt(result.count);
    }

    // Get recent posts with author info
    static async getRecentPosts(limit = 10) {
        return await db.any(`
            SELECT 
                p.*,
                u.username,
                u.profile_image_url as author_image
            FROM posts p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
            LIMIT $1
        `, [limit]);
    }

    // Delete post
    static async deletePost(postId) {
        return await db.none('DELETE FROM posts WHERE id = $1', [postId]);
    }

    // Get new posts this month
    static async getNewPostsThisMonth() {
        const result = await db.one(`
            SELECT COUNT(*) 
            FROM posts 
            WHERE created_at >= date_trunc('month', CURRENT_DATE)
        `);
        return parseInt(result.count);
    }

    // Get posts by user ID
    static async getPostsByUserId(userId) {
        try {
            return await db.any(
                `SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC`,
                [userId]
            );
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Post; 