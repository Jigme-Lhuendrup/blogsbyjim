const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const Post = require('../models/Post');

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only image files are allowed!'));
    }
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
};

// Create a new post
router.post('/', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
        const { title, content } = req.body;
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

        const post = await Post.create({
            userId: req.session.userId,
            title,
            content,
            imageUrl
        });

        res.redirect('/home');
    } catch (error) {
        console.error('Error creating post:', error);
        res.render('create-post', {
            title: 'Create Post',
            username: req.session.username,
            page: 'home',
            layout: 'layouts/main',
            error: 'Failed to create post. Please try again.',
            formData: req.body
        });
    }
});

// Get all posts
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const posts = await Post.getAllPosts();
        res.json(posts);
    } catch (error) {
        console.error('Error getting posts:', error);
        res.status(500).json({ error: 'Failed to get posts' });
    }
});

// Get a single post
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const post = await Post.getPostWithAuthorInfo(req.params.id); // Changed to getPostWithAuthorInfo
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json(post);
    } catch (error) {
        console.error('Error getting post:', error);
        res.status(500).json({ error: 'Failed to get post' });
    }
});

// Update a post
router.put('/:id', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
        const { title, content } = req.body;
        const postId = req.params.id;
        const userId = req.session.userId;

        // Get existing post
        const existingPost = await Post.getPostById(postId);
        if (!existingPost || existingPost.user_id !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Handle image update
        let imageUrl = existingPost.image_url;
        if (req.file) {
            // Delete old image if it exists
            if (existingPost.image_url) {
                const oldImagePath = path.join(__dirname, '../public', existingPost.image_url);
                await fs.unlink(oldImagePath).catch(() => {});
            }
            imageUrl = `/uploads/${req.file.filename}`;
        }

        const post = await Post.update({
            postId,
            userId,
            title,
            content,
            imageUrl
        });

        res.redirect('/home');
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).render('edit-post', {
            title: 'Edit Post',
            post: {
                id: postId,
                user_id: userId,
                title,
                content,
                image_url: imageUrl
            },
            error: 'Failed to update post. Please try again.',
            page: 'home',
            layout: 'layouts/main'
        });
    }
});

// Delete a post
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.session.userId;

        // Get existing post
        const existingPost = await Post.getPostWithAuthorInfo(postId); // Changed getPostById to getPostWithAuthorInfo
        if (!existingPost || existingPost.user_id !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Delete image if it exists
        if (existingPost.image_url) {
            const imagePath = path.join(__dirname, '../public', existingPost.image_url);
            try {
                await fs.unlink(imagePath);
            } catch (err) {
                console.error('Error deleting image file:', err);
                // Continue with post deletion even if image deletion fails
            }
        }

        const result = await Post.delete(postId, userId);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.status(200).json({ success: true, message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

module.exports = router; 