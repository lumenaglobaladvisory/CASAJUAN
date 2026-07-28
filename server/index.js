require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');

const subscribeRoutes = require('./routes/subscribe');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(express.json());

app.use(
  session({
    secret: process.env.ADMIN_PASSWORD || 'casajuan-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use('/api/admin', adminRoutes);
app.use('/api', subscribeRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Casa Juan server listening on port ${PORT}`);
});
