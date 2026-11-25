# 🤖 AI Chat API with Memory

A Node.js REST API that enables **multi-turn AI conversations** with persistent memory, powered by **Google Gemini** and **PostgreSQL (NeonDB)**. It also serves my portfolio website, which has a floating AI assistant that can answer general questions and questions about me.

## ✨ Features
- 💬 Chat with Gemini AI via REST API
- 🧠 Conversation memory: the latest 20 messages of a session are sent as context
- 🗄️ PostgreSQL-backed chat history (NeonDB), with an in-memory fallback when no database is configured
- 🔑 Session-based conversations
- 🚦 Rate limiting (10 requests/minute per IP) and input validation (max 500 characters)
- 🔁 Automatic retry with backoff for temporary Gemini errors, friendly error messages, no stack traces exposed
- 📱 Responsive portfolio page with a mobile-friendly chat widget
- 🏥 Health check endpoint

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/Praveen-DB18/ai-chat-portfolio.git
cd ai-chat-portfolio
npm install
```

### 2. Set up Environment Variables
Copy the example file and add your own credentials:
```bash
cp .env.example .env
```

The `.env` file contains private values and is ignored by Git:
```env
PORT=4000
GEMINI_API_KEY=replace_with_your_gemini_api_key
DATABASE_URL=replace_with_your_postgresql_connection_string
```

- **Gemini API Key** → [aistudio.google.com](https://aistudio.google.com) (free)
- **NeonDB** → [neon.tech](https://neon.tech) (free tier)

### 3. Set up Database
Run the SQL in `schema.sql` in your NeonDB SQL editor:
```sql
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          SERIAL PRIMARY KEY,
  session_id  VARCHAR(255) NOT NULL,
  role        VARCHAR(10)  NOT NULL CHECK (role IN ('user', 'model')),
  message     TEXT         NOT NULL,
  created_at  TIMESTAMP    DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_session_id ON chat_sessions(session_id);
```

### 4. Run the Server
```bash
npm run dev    # development (nodemon)
npm start      # production
```

Server runs at `http://localhost:4000`

---

## 📡 API Endpoints

### `POST /chat`
Start or continue a conversation. Leave out `session_id` to start a new session.

**Request:**
```json
{
  "message": "What is RAG in AI?",
  "session_id": "optional-existing-session-id"
}
```

**Response:**
```json
{
  "session_id": "uuid-here",
  "reply": "RAG stands for Retrieval-Augmented Generation..."
}
```

---

### `GET /chat/history/:sessionId`
Fetch the full conversation history for a session.

**Response:**
```json
{
  "session_id": "uuid-here",
  "message_count": 4,
  "history": [
    { "role": "user", "message": "What is RAG?", "created_at": "..." },
    { "role": "model", "message": "RAG stands for...", "created_at": "..." }
  ]
}
```

---

### `DELETE /chat/session/:sessionId`
Delete all messages in a session (clear memory).

**Response:**
```json
{
  "message": "Session uuid-here deleted",
  "deleted_messages": 4
}
```

---

### `GET /health`
Check if the server is running.

**Response:**
```json
{ "status": "ok", "time": "2026-11-22T12:00:00.000Z" }
```

---

## 🔒 Configuration and Privacy

- Never commit `.env` or real API/database credentials.
- `.env.example` contains placeholders only.
- `node_modules`, logs, coverage output, editor settings, build output, and private key files are excluded.
- Rotate both the Gemini API key and database credentials immediately if either is ever exposed publicly.
- Review screenshots before publishing to ensure they do not show private tokens, database records, or personal information.

---

## 🛠️ Tech Stack
| Layer | Tech |
|---|---|
| Runtime | Node.js v20 |
| Framework | Express.js v5 |
| AI | Google Gemini (gemini-flash-lite-latest) |
| Database | PostgreSQL via NeonDB |
| Auth | dotenv (env-based config) |

---

## 📁 Project Structure
```
ai-chat-portfolio/
├── src/
│   ├── server.js        # Entry point
│   ├── app.js           # Express app & routes
│   ├── db.js            # PostgreSQL connection pool
│   ├── gemini.js        # Gemini AI client
│   └── routes/
│       └── chat.js      # Chat API endpoints
├── public/
│   └── index.html       # Portfolio website + chat widget
├── schema.sql           # Database setup
├── .env                 # Environment variables (not committed)
├── .gitignore
└── package.json
```

---

## 🤝 Development Notes
Built with AI-assisted development (Claude Code) for code review, debugging and hardening.
