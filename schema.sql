-- Run this SQL in your NeonDB console to set up the table
-- Go to: neon.tech → Your Project → SQL Editor → paste this → Run

CREATE TABLE IF NOT EXISTS chat_sessions (
  id          SERIAL PRIMARY KEY,
  session_id  VARCHAR(255) NOT NULL,
  role        VARCHAR(10)  NOT NULL CHECK (role IN ('user', 'model')),
  message     TEXT         NOT NULL,
  created_at  TIMESTAMP    DEFAULT NOW()
);

-- Index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_session_id ON chat_sessions(session_id);
