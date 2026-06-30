const express = require('express');
const cors    = require('cors');
const mysql   = require('mysql2/promise');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ── MySQL Connection ─────────────────────────────────────────
const db = mysql.createPool({
  host:     'localhost',
  user:     'root',
  password: 'Um@i2810',
  database: 'magic_fingers',
  port:     3306,
});

// Test connection on startup
db.getConnection()
  .then(() => console.log('✅ MySQL connected!'))
  .catch(err => console.error('❌ MySQL error:', err.message));

// ── Question Generator ───────────────────────────────────────
function generateQuestion(level) {
  let a, b, op, answer;

  if (level === 'easy') {
    op = '+';
    do {
      a = Math.floor(Math.random() * 5) + 1;
      b = Math.floor(Math.random() * 5) + 1;
      answer = a + b;
    } while (answer < 1 || answer > 5);

  } else if (level === 'medium') {
    op = '+';
    do {
      a = Math.floor(Math.random() * 10) + 1;
      b = Math.floor(Math.random() * 10) + 1;
      answer = a + b;
    } while (answer < 1 || answer > 10);

  } else {
    op = Math.random() < 0.5 ? '+' : '-';
    do {
      a = Math.floor(Math.random() * 10) + 1;
      b = Math.floor(Math.random() * 10) + 1;
      if (op === '-' && a < b) [a, b] = [b, a];
      answer = op === '+' ? a + b : a - b;
    } while (answer < 1 || answer > 10);
  }

  return { a, b, op, answer };
}

// ── Routes ───────────────────────────────────────────────────

// GET /api/questions
app.get('/api/questions', (req, res) => {
  const level = (req.query.level || 'easy').toLowerCase();
  const count = Math.min(parseInt(req.query.count) || 10, 20);
  const questions = Array.from({ length: count }, () => generateQuestion(level));
  res.json({ success: true, level, questions });
});

// POST /api/score  — save to MySQL
app.post('/api/score', async (req, res) => {
  const { name, score, level } = req.body;
  if (!name || score === undefined || !level) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }
  try {
    await db.execute(
      'INSERT INTO leaderboard (name, score, level) VALUES (?, ?, ?)',
      [name.trim().slice(0, 50), Number(score), level]
    );
    res.json({ success: true, message: 'Score saved!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// GET /api/leaderboard  — fetch from MySQL
app.get('/api/leaderboard', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  try {
    const [rows] = await db.execute(
      `SELECT name, score, level, date FROM leaderboard ORDER BY score DESC LIMIT ${limit}`
    );
    res.json({ success: true, leaderboard: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/contact  — save to MySQL
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }
  try {
    await db.execute(
      'INSERT INTO messages (name, email, message) VALUES (?, ?, ?)',
      [name, email, message]
    );
    console.log('📬 New message from:', name, '-', email);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// GET /api/messages  — fetch from MySQL
app.get('/api/messages', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM messages ORDER BY date DESC LIMIT 50'
    );
    res.json({ success: true, total: rows.length, messages: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// GET /api/stats
app.get('/api/stats', async (req, res) => {
  try {
    const [[top]] = await db.execute(
      'SELECT name, score FROM leaderboard ORDER BY score DESC LIMIT 1'
    );
    const [[count]] = await db.execute(
      'SELECT COUNT(*) as total FROM leaderboard'
    );
    res.json({
      success: true,
      stats: {
        totalPlayers: count.total,
        highScore:    top?.score || 0,
        topPlayer:    top?.name  || 'Be the first!',
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🎮 Magic Fingers running at http://localhost:${PORT}\n`);
});