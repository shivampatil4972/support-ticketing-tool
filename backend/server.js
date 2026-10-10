require("dotenv").config();
require("./jobs/slaReminder");

const app = require("./app");

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Support Ticketing API running on http://localhost:${PORT}`);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
  // Graceful shutdown - give pending operations time to complete
  setTimeout(() => process.exit(1), 1000);
});