require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');
const pgSession = require('connect-pg-simple')(session);
const { db } = require('./config/database');
const fs = require('fs').promises;
const app = express();

// Log environment check
console.log('Environment Variables Check:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL ? '[SET]' : '[NOT SET]',
    SESSION_SECRET: process.env.SESSION_SECRET ? '[SET]' : '[NOT SET]'
});

// Run migrations
async function runMigrations() {
    try {
        console.log('Starting database migrations...');
        const migrationsDir = path.join(__dirname, 'migrations');
        const files = await fs.readdir(migrationsDir);
        
        const migrationFiles = files
            .filter(f => f.endsWith('.sql'))
            .sort();

        for (const file of migrationFiles) {
            console.log(`Running migration: ${file}`);
            const filePath = path.join(migrationsDir, file);
            const sql = await fs.readFile(filePath, 'utf8');
            
            try {
                await db.tx(async t => {
                    const statements = sql
                        .split(';')
                        .map(statement => statement.trim())
                        .filter(statement => statement.length > 0);

                    for (const statement of statements) {
                        await t.none(statement + ';');
                    }
                });
                console.log(`Completed migration: ${file}`);
            } catch (error) {
                console.error(`Error in migration ${file}:`, error);
                throw error;
            }
        }
        console.log('All migrations completed successfully!');
        return true;
    } catch (error) {
        console.error('Migration failed:', error);
        return false;
    }
}

// Database connection check with better error handling
async function initializeDatabase() {
    try {
        console.log('Attempting to connect to database...');
        const obj = await db.connect();
        console.log('Database connection verified');
        obj.done();

        // Run migrations after successful connection
        const migrationsSuccess = await runMigrations();
        if (!migrationsSuccess) {
            console.error('WARNING: Database migrations failed');
            return false;
        }

        return true;
    } catch (error) {
        console.error('FATAL: Database connection failed:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        return false;
    }
}

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Layout setup
app.use(expressLayouts);
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Set default layout
app.use((req, res, next) => {
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
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Method override
app.use(methodOverride('_method'));
app.use(methodOverride(function(req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        const method = req.body._method;
        delete req.body._method;
        return method;
    }
}));

// Session configuration
app.use(session({
    store: new pgSession({
        pool: db.pool,
        tableName: 'user_sessions',
        createTableIfMissing: true,
        pruneSessionInterval: 60,
        errorCallback: function(err) {
            console.error('Session store error:', err);
        }
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Log session configuration
console.log('Session Configuration:', {
    NODE_ENV: process.env.NODE_ENV,
    SESSION_SECRET: process.env.SESSION_SECRET ? '(set)' : '(not set)',
    cookie_secure: process.env.NODE_ENV === 'production',
    cookie_httpOnly: true,
    cookie_maxAge: '24 hours',
    tableName: 'user_sessions'
});

// Flash messages middleware
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
    console.error('Application error:', err);
    console.error('Error stack:', err.stack);
    const isProduction = process.env.NODE_ENV === 'production';
    res.status(err.status || 500);
    res.render('error', {
        message: isProduction ? 'An error occurred' : err.message,
        error: isProduction ? {} : err,
        layout: false
    });
});

// Server startup with port from environment
const PORT = process.env.PORT || 3002;

// Initialize database and start server
initializeDatabase().then(dbConnected => {
    if (!dbConnected) {
        console.error('WARNING: Starting server without database connection');
    }
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
        console.log(`Listening on port ${PORT}`);
        console.log(`Database connection status: ${dbConnected ? 'Connected' : 'Failed'}`);
    });
}).catch(error => {
    console.error('FATAL: Failed to initialize application:', error);
    process.exit(1);
});

module.exports = app;