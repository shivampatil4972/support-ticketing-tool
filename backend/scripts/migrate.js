// Applies the .sql files in backend/migrations that have not run yet.
// schema.sql is the baseline; every later schema change is a migration.
//
//   npm run migrate

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const migrationsDir = path.join(__dirname, "../migrations");

const main = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    const [rows] = await connection.query("SELECT name FROM schema_migrations");
    const applied = new Set(rows.map((row) => row.name));

    const pending = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql") && !applied.has(file))
      .sort();

    if (!pending.length) {
      console.log("Database is up to date.");
      return;
    }

    for (const file of pending) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

      await connection.query(sql);
      await connection.query(
        "INSERT INTO schema_migrations (name) VALUES (?)",
        [file],
      );

      console.log(`Applied ${file}`);
    }
  } finally {
    await connection.end();
  }
};

main().catch((error) => {
  console.error(`Migration failed: ${error.message}`);
  process.exitCode = 1;
});
