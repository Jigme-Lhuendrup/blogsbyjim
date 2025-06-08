require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');
const helmet = require('helmet');
const compression = require('compression');
const { db } = require('./config'); // Import your database connection
const pgSession = require('connect-pg-simple')(session);

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Layout setup
app.use(expressLayouts);
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Set default layout
app.use((req, res, next) => {
    // Set default layout based on route
    if (req.path.startsWith('/admin')) {
        res.locals.layout = 'layouts/admin';
    } else if (req.path.startsWith('/auth')) {
        res.locals.layout = 'layouts/auth';
    } else {
        res.locals.layout = 'layouts/main';
    }
    next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Method override middleware
app.use(methodOverride('_method'));
app.use(methodOverride(function(req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        const method = req.body._method;
        delete req.body._method;
        return method;
    }
}));

// Enhanced session middleware with PostgreSQL store
app.use(session({
    store: new pgSession({
        pool: db.$pool,
        tableName: 'user_sessions',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    },
    name: 'sessionId' // Custom session cookie name
}));

// Flash messages middleware (optional)
app.use((req, res, next) => {
    res.locals.success_msg = req.session.success_msg;
    res.locals.error_msg = req.session.error_msg;
    delete req.session.success_msg;
    delete req.session.error_msg;
    next();
});

// Routes
const indexRouter = require('./routes/index');
const adminRouter = require('./routes/admin');
app.use('/', indexRouter);
app.use('/admin', adminRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// 404 handler
app.use((req, res, next) => {
    res.status(404);
    res.render('error', {
        message: 'Page not found',
        error: {},
        layout: false
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack); // Log the error
    
    const message = err.message || 'An unexpected error occurred';
    const error = req.app.get('env') === 'development' ? err : {};
    
    res.status(err.status || 500);
    res.render('error', {
        message,
        error,
        layout: false
    });
});

// Server setup
const PORT = process.env.PORT || 3002;
const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err.stack);
    server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.stack);
    server.close(() => process.exit(1));
});

module.exports = app;