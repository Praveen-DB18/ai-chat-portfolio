const express = require("express");
const path = require("path");

const app = express();

// Parse incoming JSON bodies
app.use(express.json());

// Serve frontend (public/index.html)
app.use(express.static(path.join(__dirname, "../public")));

// ── Health Check ──────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────
const chatRoutes = require("./routes/chat");
app.use("/chat", chatRoutes);

// ── 404 Handler ───────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// ── Error Handler (never leak stack traces) ───
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err.message);
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON in request body." });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large." });
  }
  res.status(err.status && err.status < 500 ? err.status : 500)
    .json({ error: "Something went wrong. Please try again later." });
});

module.exports = app;
