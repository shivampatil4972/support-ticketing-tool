const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

// ==========================
// Register User
// ==========================
const registerUser = async ({
  name,
  email,
  password,
  role = "client",
  clientId = null,
}) => {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedPassword = password.trim();

  const [existing] = await pool.execute(
    "SELECT id FROM users WHERE email = ?",
    [normalizedEmail],
  );

  if (existing.length) {
    const error = new Error("Email already exists");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(trimmedPassword, 10);

  // Create organization automatically for client
  if (role === "client" && !clientId) {
    const [clientResult] = await pool.execute(
      `
      INSERT INTO clients
      (
        organization_name,
        created_at,
        updated_at
      )
      VALUES (?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
      `,
      [`${name}'s Organization`],
    );

    clientId = clientResult.insertId;
  }

  const [result] = await pool.execute(
    `
    INSERT INTO users
    (
      name,
      email,
      password,
      role,
      client_id,
      is_active,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())
    `,
    [name, normalizedEmail, hashedPassword, role, clientId],
  );

  return {
    id: result.insertId,
    name,
    email: normalizedEmail,
    role,
    client_id: clientId,
    is_active: 1,
  };
};

// ==========================
// Login User
// ==========================
const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedPassword = password.trim();

  // Only active users are allowed to log in.
  // Deactivated users have is_active = 0.
  const [rows] = await pool.execute(
    `
    SELECT *
    FROM users
    WHERE email = ?
      AND is_active = 1
    `,
    [normalizedEmail],
  );

  if (!rows.length) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const user = rows[0];

  const isValid = await bcrypt.compare(trimmedPassword, user.password);

  if (!isValid) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "8h",
    },
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      client_id: user.client_id,
      is_active: user.is_active,
    },
  };
};

module.exports = {
  registerUser,
  loginUser,
};