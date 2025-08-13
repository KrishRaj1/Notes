const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data directory exists
const dataDirectory = path.join(__dirname, 'data');
fs.mkdirSync(dataDirectory, { recursive: true });

// Initialize SQLite database
const databaseFilePath = path.join(dataDirectory, 'notes.db');
const db = new Database(databaseFilePath);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    slug TEXT PRIMARY KEY,
    content TEXT NOT NULL DEFAULT '',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const getNoteStatement = db.prepare('SELECT content, updated_at FROM notes WHERE slug = ?');
const upsertNoteStatement = db.prepare(`
  INSERT INTO notes (slug, content, updated_at)
  VALUES (@slug, @content, CURRENT_TIMESTAMP)
  ON CONFLICT(slug) DO UPDATE SET content = excluded.content, updated_at = CURRENT_TIMESTAMP
`);

app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));

function isValidSlug(slug) {
  return typeof slug === 'string' && /^[A-Za-z0-9-_]{1,100}$/.test(slug);
}

// API: Get note by slug
app.get('/api/note/:slug', (req, res) => {
  const slug = req.params.slug;
  if (!isValidSlug(slug)) {
    return res.status(400).json({ error: 'Invalid slug. Use letters, numbers, hyphen, underscore (1-100 chars).' });
  }
  const row = getNoteStatement.get(slug);
  if (row) {
    return res.json({ slug, content: row.content, updatedAt: row.updated_at });
  }
  return res.json({ slug, content: '', updatedAt: null });
});

// API: Save note by slug (PUT or POST for sendBeacon compatibility)
function saveHandler(req, res) {
  const slug = req.params.slug;
  if (!isValidSlug(slug)) {
    return res.status(400).json({ error: 'Invalid slug. Use letters, numbers, hyphen, underscore (1-100 chars).' });
  }
  const content = (req.body && typeof req.body.content === 'string') ? req.body.content : null;
  if (content === null) {
    return res.status(400).json({ error: 'Missing or invalid "content" (must be a string).' });
  }
  upsertNoteStatement.run({ slug, content });
  const row = getNoteStatement.get(slug);
  return res.json({ ok: true, updatedAt: row ? row.updated_at : null });
}
app.put('/api/note/:slug', saveHandler);
app.post('/api/note/:slug', saveHandler);

// Serve static assets
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Fallback to index.html for any non-API route (to support pretty slugs like "/my-note")
app.get(/^\/(?!api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Notepad is running on http://localhost:${PORT}`);
});