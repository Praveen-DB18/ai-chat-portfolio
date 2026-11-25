const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { chat } = require("../gemini");
const { randomUUID } = require("crypto");

const MAX_MESSAGE_LENGTH = 500;
const HISTORY_LIMIT = 20;
const BUSY_MESSAGE = "The chat is busy right now, please try again later.";

// ── Rate limit: 10 requests / minute / IP ─────────
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "You're sending messages too quickly. Please wait a minute and try again.",
    });
  },
});

// In-memory store (fallback when no DB)
const memoryStore = {};

// Try to load DB — if no DATABASE_URL, use memory only
let pool = null;
// Only treat it as configured if it looks like a real postgres URL (not a placeholder)
if (/^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL || "")) {
  pool = require("../db");
  console.log("🗄️  Using PostgreSQL for chat history");
} else {
  console.log("💾 No DATABASE_URL found — using in-memory store (history lost on restart)");
}

// ── Helper: get history ───────────────────────────
// limit: if given, return only the latest N messages (still oldest → newest)
async function getHistory(sessionId, limit = null) {
  if (pool) {
    if (limit) {
      const result = await pool.query(
        `SELECT role, message FROM (
           SELECT role, message, created_at, id FROM chat_sessions
           WHERE session_id = $1
           ORDER BY created_at DESC, id DESC
           LIMIT $2
         ) recent
         ORDER BY created_at ASC, id ASC`,
        [sessionId, limit]
      );
      return result.rows;
    }
    const result = await pool.query(
      `SELECT role, message FROM chat_sessions WHERE session_id = $1 ORDER BY created_at ASC, id ASC`,
      [sessionId]
    );
    return result.rows;
  }
  const all = memoryStore[sessionId] || [];
  return limit ? all.slice(-limit) : all;
}

// Gemini history must start with a "user" turn
function trimToUserStart(history) {
  const firstUser = history.findIndex((msg) => msg.role === "user");
  return firstUser === -1 ? [] : history.slice(firstUser);
}

// ── Helper: save message ──────────────────────────
async function saveMessage(sessionId, role, message) {
  if (pool) {
    await pool.query(
      `INSERT INTO chat_sessions (session_id, role, message) VALUES ($1, $2, $3)`,
      [sessionId, role, message]
    );
  } else {
    if (!memoryStore[sessionId]) memoryStore[sessionId] = [];
    memoryStore[sessionId].push({ role, message });
  }
}

// ── Helper: delete session ────────────────────────
async function deleteSession(sessionId) {
  if (pool) {
    const result = await pool.query(
      `DELETE FROM chat_sessions WHERE session_id = $1`,
      [sessionId]
    );
    return result.rowCount;
  }
  const count = (memoryStore[sessionId] || []).length;
  delete memoryStore[sessionId];
  return count;
}

// ─────────────────────────────────────────────
// POST /chat
// ─────────────────────────────────────────────
router.post("/", chatLimiter, async (req, res) => {
  const { message, session_id } = req.body || {};

  if (typeof message !== "string" || message.trim() === "") {
    return res.status(400).json({ error: "Message cannot be empty." });
  }
  const text = message.trim();
  if (text.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: `Message is too long. Please keep it under ${MAX_MESSAGE_LENGTH} characters.`,
    });
  }
  if (session_id != null && (typeof session_id !== "string" || session_id.length > 255)) {
    return res.status(400).json({ error: "Invalid session_id." });
  }

  const sessionId = session_id || randomUUID();

  let history;
  try {
    history = trimToUserStart(await getHistory(sessionId, HISTORY_LIMIT));
  } catch (err) {
    console.error("❌ History load error:", err.message);
    return res.status(500).json({ error: "Something went wrong. Please try again later." });
  }

  let aiReply;
  try {
    aiReply = await chat(history, text);
    if (!aiReply || !aiReply.trim()) throw new Error("Empty reply from Gemini");
  } catch (err) {
    // Log details server-side only — never send them to the client
    console.error("❌ Gemini error:", err.status || "", err.message);
    return res.status(503).json({ error: BUSY_MESSAGE });
  }

  try {
    await saveMessage(sessionId, "user",  text);
    await saveMessage(sessionId, "model", aiReply);
  } catch (err) {
    // Reply is still useful even if saving fails
    console.error("❌ Save error:", err.message);
  }

  res.status(200).json({ session_id: sessionId, reply: aiReply });
});

// ─────────────────────────────────────────────
// GET /chat/history/:sessionId
// ─────────────────────────────────────────────
router.get("/history/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  try {
    const history = await getHistory(sessionId);
    if (!history.length) return res.status(404).json({ error: "Session not found" });
    res.status(200).json({ session_id: sessionId, message_count: history.length, history });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ─────────────────────────────────────────────
// DELETE /chat/session/:sessionId
// ─────────────────────────────────────────────
router.delete("/session/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  try {
    const count = await deleteSession(sessionId);
    if (!count) return res.status(404).json({ error: "Session not found" });
    res.status(200).json({ message: `Session ${sessionId} deleted`, deleted_messages: count });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong" });
  }
});

module.exports = router;

