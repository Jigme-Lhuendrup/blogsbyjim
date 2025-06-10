require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');
const pgSession = require('connect-pg-simple')(session);
const { db } = require('./config/database');
const app = express();

// Database connection check
db.connect()
  .then(obj => {
    console.log('Database connection verified');
    obj.done();
  })
  .catch(error => {
    console.error('Database connection error:', error);
  });

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

// Session middleware with PostgreSQL store
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
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

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
  console.error(err.stack);
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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`Listening on port ${PORT}`);
});

module.exports = app;