// override: .env wins over stale variables left in the terminal session
require("dotenv").config({ override: true });
const app = require("./app");

const PORT = process.env.PORT || 4000;

// Express 5 passes listen errors (e.g. port already in use) to this callback
app.listen(PORT, (err) => {
  if (err) {
    console.error(
      err.code === "EADDRINUSE"
        ? `❌ Port ${PORT} is already in use. Is another "npm run dev" still running?`
        : `❌ Server failed to start: ${err.message}`
    );
    process.exit(1);
  }
  console.log(`Server running on http://localhost:${PORT}`);
});