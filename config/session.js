const session = require('express-session');

const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'estrella-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  },
  name: 'estrella-session-id'
};

module.exports = sessionConfig;
