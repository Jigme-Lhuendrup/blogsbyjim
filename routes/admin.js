const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Contact = require('../models/Contact'); // Import Contact model
const bcrypt = require('bcrypt');

// Admin middleware
const isAdmin = async (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    try {
        const user = await User.findById(req.session.userId);
        if (!user || !user.is_admin) {
            return res.redirect('/home');
        }
        next();
    } catch (error) {
        console.error('Error checking admin status:', error);
        res.redirect('/home');
    }
};

// Apply admin middleware to all routes
router.use(isAdmin);

// Admin dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const stats = {
            totalUsers: await User.getTotalCount(),
            totalPosts: await Post.getTotalCount(),
            totalComments: await Contact.getTotalCount() // Fetch total contacts
        };
        const recentUsers = await User.getRecentUsers(10);
        const recentPosts = await Post.getRecentPosts(10);

        res.render('admin/dashboard', {
            title: 'Admin Dashboard',
            page: 'dashboard',
            user,
            stats,
            recentUsers,
            recentPosts,
            layout: 'layouts/admin'
        });
    } catch (error) {
        console.error('Error loading admin dashboard:', error);
        res.redirect('/home');
    }
});

// Reports page
router.get('/reports', async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const stats = {
            newUsersThisMonth: await User.getNewUsersThisMonth(),
            newPostsThisMonth: await Post.getNewPostsThisMonth(),
            activeUsersToday: await User.getActiveUsersToday()
        };

        const contacts = await Contact.getAll(); // Fetch all contacts

        res.render('admin/reports', {
            title: 'Reports',
            page: 'reports',
            user,
            stats,
            contacts, // Pass contacts to the view
            layout: 'layouts/admin'
        });
    } catch (error) {
        console.error('Error loading reports:', error);
        res.redirect('/admin/dashboard');
    }
});

// Settings page
router.get('/settings', async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        const settings = {
            siteName: 'Blogs by Jim',
            siteDescription: 'A place to share your thoughts',
            postsPerPage: 10
        };

        res.render('admin/settings', {
            title: 'Settings',
            page: 'settings',
            user,
            settings,
            layout: 'layouts/admin'
        });
    } catch (error) {
        console.error('Error loading settings:', error);
        res.redirect('/admin/dashboard');
    }
});

// Update site settings
router.post('/settings/site', async (req, res) => {
    try {
        const { siteName, siteDescription, postsPerPage } = req.body;
        // TODO: Implement settings update in database
        res.redirect('/admin/settings');
    } catch (error) {
        console.error('Error updating site settings:', error);
        res.redirect('/admin/settings');
    }
});

// Update admin password
router.post('/settings/account', async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        
        if (newPassword !== confirmPassword) {
            return res.redirect('/admin/settings?error=passwords_dont_match');
        }

        const user = await User.findById(req.session.userId);
        const isValidPassword = await User.validatePassword(currentPassword, user.password);
        
        if (!isValidPassword) {
            return res.redirect('/admin/settings?error=invalid_current_password');
        }

        await User.updatePassword(req.session.userId, newPassword);
        res.redirect('/admin/settings?success=password_updated');
    } catch (error) {
        console.error('Error updating admin password:', error);
        res.redirect('/admin/settings?error=update_failed');
    }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
    console.log(`Attempting to delete user with ID: ${req.params.id}`); // Log attempt
    try {
        const userId = req.params.id;
        
        // Don't allow deleting the admin user
        const userToDelete = await User.findById(userId);
        if (userToDelete.is_admin) {
            return res.status(403).json({ error: 'Cannot delete admin user' });
        }

        await User.deleteUser(userId);
        console.log(`Successfully deleted user with ID: ${userId}`); // Log success
        res.json({ success: true });
    } catch (error) {
        console.error(`Error deleting user with ID ${req.params.id}:`, error); // Log error with ID
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Delete post
router.delete('/posts/:id', async (req, res) => {
    console.log(`Attempting to delete post with ID: ${req.params.id}`); // Log attempt
    try {
        const postId = req.params.id;
        await Post.deletePost(postId);
        console.log(`Successfully deleted post with ID: ${postId}`); // Log success
        res.json({ success: true });
    } catch (error) {
        console.error(`Error deleting post with ID ${req.params.id}:`, error); // Log error with ID
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

module.exports = router; 