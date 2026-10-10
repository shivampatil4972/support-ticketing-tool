// Creates an admin account. Public signup only creates clients, so this is
// how the first admin gets in:
//
//   npm run create-admin -- "Admin Name" admin@example.com "password"

require("dotenv").config();

const pool = require("../config/database");
const { registerUser } = require("../services/authService");

const main = async () => {
  const [name, email, password] = process.argv.slice(2);

  if (!name || !email || !password) {
    console.error(
      'Usage: npm run create-admin -- "Admin Name" admin@example.com "password"',
    );
    process.exitCode = 1;
    return;
  }

  if (password.length < 6) {
    console.error("Password must be at least 6 characters");
    process.exitCode = 1;
    return;
  }

  try {
    const user = await registerUser({ name, email, password, role: "admin" });

    console.log(`Admin created: ${user.email} (id ${user.id})`);
  } catch (error) {
    console.error(`Could not create admin: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

main();
