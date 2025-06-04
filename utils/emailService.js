const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Log environment variables (excluding sensitive data)
console.log('Environment Variables Check:', {
    SMTP_USER: process.env.SMTP_USER ? 'Set' : 'Not Set',
    SMTP_PASS: process.env.SMTP_PASS ? 'Set' : 'Not Set',
    SMTP_FROM: process.env.SMTP_FROM ? 'Set' : 'Not Set',
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT
});

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 5000,    // 5 seconds
    socketTimeout: 10000,     // 10 seconds
    debug: true
});

// Verify transporter configuration
transporter.verify(function(error, success) {
    if (error) {
        console.error('Email configuration error:', error);
        console.error('Current configuration:', {
            host: 'smtp.gmail.com',
            port: 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS ? '(password set)' : '(password not set)'
            }
        });
    } else {
        console.log('Email server is ready to send messages');
    }
});

const sendVerificationEmail = async (email, token) => {
    const port = process.env.PORT || 3000; // Default to 3000 if PORT is not set
    const verificationLink = `http://localhost:${port}/verify/${token}`;
    
    const mailOptions = {
        from: {
            name: 'Blogs By Jim',
            address: process.env.SMTP_USER
        },
        to: email,
        subject: 'Verify Your Email - Blogs By Jim',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #3A3238;">Welcome to Blogs By Jim!</h2>
                <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
                <a href="${verificationLink}" 
                   style="display: inline-block; 
                          background-color: #8B6F6F; 
                          color: white; 
                          padding: 12px 24px; 
                          text-decoration: none; 
                          border-radius: 25px; 
                          margin: 20px 0;">
                    Verify Email
                </a>
                <p>Or copy and paste this link in your browser:</p>
                <p>${verificationLink}</p>
                <p>This link will expire in 24 hours.</p>
                <p style="color: #666; font-size: 0.9em; margin-top: 20px;">
                    If you didn't create an account with Blogs By Jim, please ignore this email.
                </p>
            </div>
        `
    };

    try {
        console.log('Attempting to send email with configuration:', {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject,
            smtp_user: process.env.SMTP_USER,
            smtp_pass_length: process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0
        });
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return true;
    } catch (error) {
        console.error('Detailed email error:', error);
        console.error('Mail options used:', {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject
        });
        throw new Error('Failed to send verification email. Please try again later.');
    }
};

module.exports = {
    sendVerificationEmail
}; 