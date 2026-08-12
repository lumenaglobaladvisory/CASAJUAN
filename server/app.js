require('dotenv').config();

const express = require('express');
const path = require('path');

const subscribeRoutes = require('./routes/subscribe');
const adminRoutes = require('./routes/admin');
const bookRoutes = require('./routes/book');

const app = express();

app.disable('x-powered-by');
app.use(express.json());

app.use('/api/admin', adminRoutes);
app.use('/api', subscribeRoutes);
app.use('/api', bookRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

app.get('/book', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'book.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'about.html'));
});

app.get('/faq', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'faq.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

module.exports = app;
