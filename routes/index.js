const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const { sendVerificationEmail } = require('../utils/emailService');
const Contact = require('../models/Contact');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getUrl } = require('../utils/urlHelper');

// Import posts router
const postsRouter = require('./posts');

// Use posts router
router.use('/posts', postsRouter);

// Multer setup for profile image uploads
const profileImageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../public/uploads/profiles');
        // Ensure the directory exists
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Sanitize filename and ensure uniqueness
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, `user-${req.session.userId}-${uniqueSuffix}${extension}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload an image.'), false);
    }
};

const uploadProfileImage = multer({
    storage: profileImageStorage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Landing page route
router.get('/', (req, res) => {
    res.render('index', { 
        title: 'Welcome',
        layout: 'layouts/auth'
    });
});

// Login page route
router.get('/login', (req, res) => {
    const { verified, registered } = req.query;
    let success = null;
    
    if (verified === 'true') {
        success = 'Email verified successfully! You can now login.';
    } else if (registered === 'true') {
        success = 'Registration successful! Please check your email to verify your account.';
    }
    
    res.render('login', { 
        error: null, 
        success,
        title: 'Login',
        layout: 'layouts/auth'
    });
});

// Signup page route
router.get('/signup', (req, res) => {
    res.render('signup-part1', {
        error: null,
        title: 'Sign Up',
        layout: 'layouts/auth'
    });
});

// Handle login submission
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findByEmail(email);
        if (!user) {
            return res.render('login', {
                error: 'Invalid email or password',
                email,
                title: 'Login',
                layout: 'layouts/auth'
            });
        }

        // Check if user is verified
        if (!user.is_verified) {
            return res.render('verification-pending', {
                email,
                error: 'Please verify your email before logging in.',
                title: 'Verification Required',
                layout: 'layouts/auth'
            });
        }

        // Validate password
        const isValidPassword = await User.validatePassword(password, user.password);
        if (!isValidPassword) {
            return res.render('login', {
                error: 'Invalid email or password',
                email,
                title: 'Login',
                layout: 'layouts/auth'
            });
        }

        // Set user session
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.isAdmin = user.is_admin;

        // Redirect based on user role
        if (user.is_admin) {
            res.redirect(getUrl('/admin/dashboard'));
        } else {
            res.redirect(getUrl('/about'));
        }
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', {
            error: 'An error occurred during login. Please try again.',
            email: req.body.email,
            title: 'Login',
            layout: 'layouts/auth'
        });
    }
});

// About page route
router.get('/about', (req, res) => {
    // Check if user is logged in
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.render('about', {
        title: 'About Us',
        page: 'about',
        username: req.session.username,
        layout: 'layouts/main'  // Explicitly set the layout
    });
});

// Logout route
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
});

// Signup part 1 route
router.post('/signup-part1', async (req, res) => {
    try {
        const { email, password, confirmPassword } = req.body;
        console.log('Signup part 1 submission:', { 
            email: email ? '(provided)' : '(missing)',
            password_length: password ? password.length : 0
        });

        // Basic validation
        if (!email || !password) {
            return res.status(400).render('signup-part1', { 
                error: 'Email and password are required',
                email: email || ''
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).render('signup-part1', { 
                error: 'Passwords do not match',
                email: email
            });
        }

        // Store in session with a promise to ensure it's saved
        await new Promise((resolve, reject) => {
            req.session.signupData = {
                email,
                password,
                timestamp: Date.now()
            };
            
            req.session.save((err) => {
                if (err) {
                    console.error('Error saving session:', err);
                    reject(err);
                } else {
                    console.log('Stored signup data in session:', { 
                        email: '(provided)',
                        password_length: password.length,
                        timestamp: Date.now()
                    });
                    resolve();
                }
            });
        });

        // Only redirect after session is saved
        res.redirect('/signup-part2');
    } catch (error) {
        console.error('Signup part 1 error:', error);
        res.status(500).render('signup-part1', { 
            error: 'An error occurred during signup. Please try again.',
            email: email || ''
        });
    }
});

// Signup part 2 route
router.post('/signup/complete', async (req, res) => {
    try {
        const { username, gender, dob } = req.body;
        const signupData = req.session.signupData;

        console.log('Signup completion attempt:', {
            email: signupData?.email ? '(provided)' : '(missing)',
            password_length: signupData?.password ? signupData.password.length : 0,
            username,
            gender,
            dob,
            session_timestamp: signupData?.timestamp,
            current_time: Date.now(),
            session_age: signupData?.timestamp ? `${Math.round((Date.now() - signupData.timestamp) / 1000)}s` : 'N/A'
        });

        // Check if session data exists and is not expired (30 minutes)
        if (!signupData || !signupData.email || !signupData.password || 
            Date.now() - signupData.timestamp > 30 * 60 * 1000) {
            console.log('Signup session expired');
            return res.status(400).render('signup-part1', { 
                error: 'Signup session expired. Please start over.',
                email: ''
            });
        }

        // Check if username is taken
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            return res.status(400).render('signup-part2', { 
                error: 'Username already taken',
                username,
                gender,
                dob
            });
        }

        // Create user
        const user = await User.createUser({
            email: signupData.email,
            password: signupData.password,
            username,
            gender,
            dob: new Date(dob)
        });

        console.log('User created successfully:', {
            user_id: user.id,
            email: user.email,
            username: user.username,
            has_verification_token: !!user.verification_token
        });

        // Send verification email
        try {
            await sendVerificationEmail(user.email, user.verification_token);
            console.log('Verification email sent successfully to:', user.email);
        } catch (emailError) {
            console.error('Error sending verification email:', emailError);
            // Continue with signup even if email fails
        }

        // Clear signup data from session
        delete req.session.signupData;
        req.session.save((err) => {
            if (err) {
                console.error('Error clearing session data:', err);
            }
        });

        res.render('verification-pending', { email: user.email });
    } catch (error) {
        console.error('Signup completion error:', error);
        res.status(500).render('error', { 
            message: 'Error completing signup',
            error: error
        });
    }
});

// Resend verification email route
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;
        
        // Find user
        const user = await User.findByEmail(email);
        if (!user) {
            return res.render('verification-pending', {
                email,
                error: 'Account not found.',
                title: 'Verification Required',
                layout: 'layouts/auth'
            });
        }

        if (user.is_verified) {
            return res.render('verification-pending', {
                email,
                error: 'This account is already verified. Please login.',
                title: 'Already Verified',
                layout: 'layouts/auth'
            });
        }

        // Generate new verification token
        const updatedUser = await User.resendVerification(user.id);
        
        // Send new verification email
        await sendVerificationEmail(email, updatedUser.verification_token);

        res.render('verification-pending', {
            email,
            success: 'Verification email has been resent. Please check your inbox.',
            title: 'Verification Email Sent',
            layout: 'layouts/auth'
        });
    } catch (error) {
        console.error('Error resending verification:', error);
        res.render('verification-pending', {
            email: req.body.email,
            error: 'Failed to resend verification email. Please try again.',
            title: 'Verification Error',
            layout: 'layouts/auth'
        });
    }
});

// Email verification route
router.get('/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.verifyEmail(token);
        
        if (!user) {
            return res.render('verification-error', {
                error: 'Invalid or expired verification link',
                title: 'Verification Failed',
                layout: 'layouts/auth'
            });
        }

        res.redirect(getUrl('/login?verified=true'));
    } catch (error) {
        console.error('Error in email verification:', error);
        res.render('verification-error', {
            error: 'An error occurred during verification',
            title: 'Verification Error',
            layout: 'layouts/auth'
        });
    }
});

// Contact page route
router.get('/contact', (req, res) => {
    // Check if user is logged in
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.render('contact', {
        title: 'Contact Us',
        page: 'contact',
        username: req.session.username,
        layout: 'layouts/main'
    });
});

// Handle contact form submission
router.post('/contact', async (req, res) => {
    try {
        const { email, comment } = req.body;

        // Basic validation
        if (!email || !comment) {
            return res.render('contact', {
                title: 'Contact Us',
                page: 'contact',
                username: req.session.username,
                layout: 'layouts/main',
                error: 'Please fill in all fields',
                email,
                comment
            });
        }

        // Save to database
        await Contact.create(email, comment);

        // Render success message
        res.render('contact', {
            title: 'Contact Us',
            page: 'contact',
            username: req.session.username,
            layout: 'layouts/main',
            success: 'Thank you for your message! We will get back to you soon.',
            email: ''
        });
    } catch (error) {
        console.error('Contact form error:', error);
        res.render('contact', {
            title: 'Contact Us',
            page: 'contact',
            username: req.session.username,
            layout: 'layouts/main',
            error: 'An error occurred. Please try again.',
            email: req.body.email,
            comment: req.body.comment
        });
    }
});

// Profile page route
router.get('/profile', async (req, res) => {
    // Check if user is logged in
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    try {
        // Get user details
        const user = await User.findById(req.session.userId);
        if (!user) {
            req.session.destroy();
            return res.redirect('/login');
        }
        
        // Get user's posts
        const posts = await Post.getPostsByUserId(req.session.userId);

        res.render('profile_new', { // Render the new profile page
            title: 'My Profile', // Title for the new page
            page: 'profile', // 'page' variable might still be useful or can be ignored by new page
            username: req.session.username,
            user,
            posts,
            layout: false // Ensure no layout is applied
        });
    } catch (error) {
        console.error('Error getting profile:', error);
        // It's good practice to also update the error rendering,
        // though ideally this self-contained page might have its own error display.
        // For now, we'll render profile_new with an error flag.
        res.render('profile_new', {
            title: 'My Profile - Error',
            page: 'profile',
            username: req.session.username,
            user: { username: req.session.username }, // Basic user object for fallback
            posts: [],
            error: 'Failed to load profile data. Please try again.', // Error message for the new page
            layout: false // Ensure no layout is applied
        });
    }
});

// Update profile route
router.post('/profile', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    try {
        const { username, email, gender, dateOfBirth } = req.body;
        await User.update(req.session.userId, {
            username,
            email,
            gender,
            dateOfBirth
        });

        // Update session username if changed
        if (username !== req.session.username) {
            req.session.username = username;
        }

        res.redirect('/profile');
    } catch (error) {
        console.error('Error updating profile:', error);
        res.redirect('/profile?error=update-failed');
    }
});

// New Profile image upload route
router.post('/profile/upload-image', uploadProfileImage.single('profileImage'), async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded or file type is not supported.' });
    }

    try {
        const imageUrl = `/uploads/profiles/${req.file.filename}`;
        
        
        // Update user's profile_image_url in the database
        await User.updateProfileImage(req.session.userId, imageUrl);

        res.json({ success: true, imageUrl: imageUrl, message: 'Profile picture updated successfully!' });
    } catch (error) {
        console.error('Error uploading profile image:', error);
        // Attempt to delete the uploaded file if DB update fails
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Error deleting uploaded file after DB error:", err);
            });
        }
        res.status(500).json({ success: false, message: 'Failed to update profile picture. ' + error.message });
    }
}, (error, req, res, next) => { // Multer error handler
    if (error instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: `File upload error: ${error.message}` });
    } else if (error) {
        // This handles the error from fileFilter
        return res.status(400).json({ success: false, message: error.message });
    }
    next();
});

// Create page route
router.get('/create', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    const success = req.query.success === 'true' ? 'Post published successfully!' : null;
    const lastPostTitle = req.query.title || null;

    res.render('create', {
        title: 'Create Post',
        page: 'create',
        username: req.session.username,
        error: null,
        success,
        lastPostTitle,
        layout: 'layouts/main'
    });
});

// Handle post creation
router.post('/create', express.json(), async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    try {
        const { title, content } = req.body;

        // Validate input
        if (!title || !content) {
            return res.redirect('/create?error=Title and content are required');
        }

        const post = await Post.create({
            userId: req.session.userId,
            title,
            content
        });

        // Redirect back to create page with success message
        return res.redirect('/create?success=true&title=' + encodeURIComponent(title));
    } catch (error) {
        console.error('Error creating post:', error);
        return res.redirect('/create?error=' + encodeURIComponent('Failed to create post. Please try again.'));
    }
});

// Test database connection
router.get('/test-db', async (req, res) => {
    try {
        const result = await Post.getTotalCount();
        console.log('Database test - Total posts:', result);
        res.json({ success: true, count: result });
    } catch (error) {
        console.error('Database test error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// New Home page route
router.get('/new-home', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    try {
        const posts = await Post.getAllPostsWithAuthorInfo();
        
        res.render('new_home', { // Render the new_home.ejs
            title: 'Home',
            page: 'home', // Keep 'page' variable consistent if layout uses it
            username: req.session.username,
            posts,
            layout: false // Page is now standalone
        });
    } catch (error) {
        console.error('Error fetching posts for new_home:', error);
        res.render('new_home', { // Render new_home.ejs on error too
            title: 'Home',
            page: 'home',
            username: req.session.username,
            posts: [],
            error: 'Failed to load posts',
            layout: false // Page is now standalone
        });
    }
});

// Old Home page route - redirect to new-home
router.get('/home', (req, res) => {
    res.redirect('/new-home');
});

// Get single post (this is used by the modal in new_home.ejs)
router.get('/posts/:id', async (req, res) => {
    try {
        const post = await Post.getPostWithAuthorInfo(req.params.id);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        res.json(post);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ error: 'Failed to load post' });
    }
});

// Post success page route
router.get('/post-success', async (req, res) => {
    console.log('Accessing post-success page with query:', req.query);
    console.log('Session data:', { 
        userId: req.session.userId,
        username: req.session.username
    });

    if (!req.session.userId) {
        console.log('User not authenticated, redirecting to login');
        return res.redirect('/login');
    }

    try {
        const postId = req.query.id;
        if (!postId) {
            console.error('No post ID provided in query parameters');
            return res.redirect('/home');
        }

        console.log('Fetching post with ID:', postId);
        const post = await Post.getPostWithAuthorInfo(postId);
        
        if (!post) {
            console.error('Post not found with ID:', postId);
            return res.redirect('/home');
        }

        console.log('Post found:', {
            id: post.id,
            title: post.title,
            userId: post.user_id,
            created_at: post.created_at
        });

        console.log('Rendering success page');
        res.render('post-success', {
            title: 'Post Published',
            page: 'post-success',
            username: req.session.username,
            post,
            layout: 'layouts/main'
        });
    } catch (error) {
        console.error('Error in post-success route:', error);
        res.redirect('/home');
    }
});

module.exports = router; 