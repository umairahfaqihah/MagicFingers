# 🖐️ Magic Fingers – Educational Math Game

An AI-powered educational math game for children using **MediaPipe hand gesture recognition**.
Kids solve math problems by holding up the correct number of fingers!

---

## 📁 Project Structure

```
magic-fingers/
├── backend/
│   └── server.js          # Express API server
├── frontend/
│   ├── index.html          # Landing page
│   ├── game.html           # Game screen
│   ├── css/
│   │   ├── landing.css     # Landing page styles
│   │   └── game.css        # Game screen styles
│   └── js/
│       ├── landing.js      # Landing page logic + leaderboard
│       └── game.js         # Game engine + MediaPipe AI
├── package.json
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org) v16 or higher

### 1. Install dependencies
```bash
npm install
```

### 2. Start the server
```bash
npm start
```

### 3. Open in browser
```
http://localhost:3000
```

> ⚠️ **Important:** The game requires a **webcam** and must be opened in a browser that supports camera access. Use **Chrome** or **Edge** for best results.

---

## 🎮 How to Play

1. Click **Get Started** on the landing page
2. Choose a difficulty level: **Easy**, **Medium**, or **Hard**
3. **Allow camera access** when prompted
4. A math problem appears on screen
5. **Hold up fingers** equal to the answer
6. Keep your fingers steady for ~0.6 seconds — the AI confirms your answer!
7. Earn stars, score points, and beat the leaderboard!

---

## 🧠 AI Technology

- **Google MediaPipe Hands** — Detects hand landmarks in real-time
- 21 hand landmarks tracked per frame
- Finger counting via landmark position analysis
- Hold-to-confirm prevents accidental answers (~18 frames at 30fps)

---

## 🌐 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/questions?level=easy&count=10` | Get math questions |
| POST | `/api/score` | Save a player score |
| GET | `/api/leaderboard?limit=10` | Get top scores |
| GET | `/api/stats` | Get global stats |

### POST /api/score body
```json
{
  "name": "PlayerName",
  "score": 150,
  "level": "easy"
}
```

---

## ⚙️ Configuration

Edit `backend/server.js` to change:
- `PORT` — default is `3000`
- Question difficulty ranges
- Leaderboard size limits

Edit `frontend/js/game.js` to adjust:
- `holdThreshold` — frames to hold (default 18 ≈ 0.6s)
- Timer duration (`state.timeLeft = 120`)
- Scoring per level

---

## 🧩 Levels

| Level | Operations | Range | Points/Q |
|-------|-----------|-------|----------|
| Easy | + only | 1–5 | 10 |
| Medium | + and − | 1–9 | 20 |
| Hard | +, −, × | 1–10 | 30 |

---

## 🛠️ Development

For auto-reload during development:
```bash
npm run dev
```
(requires `nodemon`)

---

## 📱 Browser Support

| Browser | Support |
|---------|---------|
| Chrome 80+ | ✅ Full |
| Edge 80+ | ✅ Full |
| Firefox 75+ | ✅ Full |
| Safari 14+ | ⚠️ Limited (camera permissions vary) |
| Mobile Chrome | ✅ Works |

---

## 🔧 Troubleshooting

**Camera not working?**
- Ensure you're on `http://localhost:3000` (not opening the HTML file directly)
- Check browser camera permissions
- Try Chrome if using another browser

**MediaPipe not loading?**
- Check internet connection (CDN required on first load)
- MediaPipe models download from jsdelivr.net

**Leaderboard empty?**
- Make sure the backend server is running
- Check console for API errors

---

## 📄 License

MIT — Free to use and modify for educational purposes.

Made with ❤️ for young learners everywhere 🌟
