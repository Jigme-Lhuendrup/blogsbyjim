const User = require('../models/User');
const bcrypt = require('bcrypt');

exports.showVerificationPage = (req, res) => {
    res.render('auth/verify', { 
        message: 'Please enter the verification code sent to your email',
        error: null 
    });
};

exports.verifyEmail = async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code) {
            return res.render('auth/verify', {
                message: 'Please enter the verification code',
                error: 'Verification code is required'
            });
        }

        const user = await User.verifyEmail(code);
        
        if (!user) {
            return res.render('auth/verify', {
                message: 'Invalid or expired verification code',
                error: 'Please try again or request a new code'
            });
        }

        req.session.success_msg = 'Email verified successfully! You can now login.';
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Verification error:', error);
        res.render('auth/verify', {
            message: 'An error occurred during verification',
            error: 'Please try again later'
        });
    }
};

exports.resendVerification = async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.redirect('/auth/login');
        }

        await User.resendVerification(userId);
        req.session.success_msg = 'A new verification code has been generated. Please check the console logs for the code.';
        res.redirect('/auth/verify');
    } catch (error) {
        console.error('Resend verification error:', error);
        req.session.error_msg = 'Failed to resend verification code';
        res.redirect('/auth/verify');
    }
};

// ... rest of the existing methods ... 