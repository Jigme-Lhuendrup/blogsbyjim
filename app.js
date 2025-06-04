require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');
const app = express();

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

// Method override middleware - support both query string and form field
app.use(methodOverride('_method'));
app.use(methodOverride(function(req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
        const method = req.body._method;
        delete req.body._method;
        return method;
    }
}));

// Session middleware
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

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
    // Set locals, only providing error in development
    const message = err.message || 'An unexpected error occurred';
    const error = req.app.get('env') === 'development' ? err : {};
    
    // Set status code
    res.status(err.status || 500);
    
    // Render the error page
    res.render('error', {
        message,
        error,
        layout: false
    });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
