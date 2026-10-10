const pool = require("../config/database");
const bcrypt = require("bcryptjs");

// ==============================
// USER MANAGEMENT
// ==============================

const getAllUsers = async () => {
  const [rows] = await pool.execute(`
    SELECT
      id,
      name,
      email,
      role,
      client_id,
      is_active,
      created_at,
      updated_at
    FROM users
    WHERE is_active = 1
    ORDER BY created_at DESC
  `);

  return rows;
};

const createUser = async ({ name, email, password, role, clientId }) => {
  email = email.trim().toLowerCase();

  // Check for duplicate email
  const [existing] = await pool.execute(
    "SELECT id FROM users WHERE email = ?",
    [email],
  );

  if (existing.length) {
    const error = new Error("Email already exists");
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

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
    [name, email, hashedPassword, role, clientId],
  );

  return {
    id: result.insertId,
    name,
    email,
    role,
    client_id: clientId,
    is_active: 1,
  };
};

const updateUser = async (id, fields) => {
  // Only allow these fields to be updated from Admin UI.
  const allowedFields = [
    "name",
    "email",
    "role",
    "client_id",
  ];

  const entries = Object.entries(fields).filter(
    ([key, value]) =>
      allowedFields.includes(key) && value !== undefined,
  );

  if (!entries.length) {
    return { id };
  }

  const sets = entries
    .map(([key]) => `\`${key}\` = ?`)
    .join(", ");

  const values = entries.map(([, value]) => value);

  values.push(id);

  let result;

  try {
    [result] = await pool.execute(
      `
      UPDATE users
      SET
        ${sets},
        updated_at = UTC_TIMESTAMP()
      WHERE id = ?
        AND is_active = 1
      `,
      values,
    );
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      const error = new Error("Email already exists");
      error.statusCode = 409;
      throw error;
    }

    throw err;
  }

  if (result.affectedRows === 0) {
    const error = new Error("User not found or already deactivated");
    error.statusCode = 404;
    throw error;
  }

  return {
    id,
    ...fields,
  };
};

// ==============================
// Soft Delete / Deactivate User
// ==============================

const deleteUser = async (id) => {
  const [result] = await pool.execute(
    `
    UPDATE users
    SET
      is_active = 0,
      updated_at = UTC_TIMESTAMP()
    WHERE id = ?
      AND is_active = 1
    `,
    [id],
  );

  if (result.affectedRows === 0) {
    const error = new Error("User not found or already deactivated");
    error.statusCode = 404;
    throw error;
  }

  return {
    id,
    is_active: 0,
  };
};

// ==============================
// CLIENT MANAGEMENT
// ==============================

const getAllClients = async () => {
  const [rows] = await pool.execute(`
    SELECT *
    FROM clients
    ORDER BY created_at DESC
  `);

  return rows;
};

const createClient = async ({ organizationName }) => {
  const [result] = await pool.execute(
    `
    INSERT INTO clients
    (organization_name, created_at, updated_at)
    VALUES (?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
    `,
    [organizationName],
  );

  return {
    id: result.insertId,
    organization_name: organizationName,
  };
};

const updateClient = async (id, organizationName) => {
  const [result] = await pool.execute(
    `
    UPDATE clients
    SET
      organization_name = ?,
      updated_at = UTC_TIMESTAMP()
    WHERE id = ?
    `,
    [organizationName, id],
  );

  if (result.affectedRows === 0) {
    const error = new Error("Client not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    id,
    organization_name: organizationName,
  };
};

// ==============================
// CLIENT DELETE
// ==============================

const deleteClient = async (id) => {
  // Check for existing tickets before deleting
  const [tickets] = await pool.execute(
    `SELECT COUNT(*) AS count FROM tickets WHERE client_id = ? AND is_deleted = 0`,
    [id],
  );

  if (tickets[0].count > 0) {
    const error = new Error(
      "Cannot delete client with active tickets. Please close or delete all tickets first."
    );
    error.statusCode = 400;
    throw error;
  }

  const [result] = await pool.execute(
    `
    DELETE FROM clients
    WHERE id = ?
    `,
    [id],
  );

  if (result.affectedRows === 0) {
    const error = new Error("Client not found");
    error.statusCode = 404;
    throw error;
  }

  return { id };
};

// ==============================
// DASHBOARD
// ==============================

const getDashboardStats = async () => {
  const [[users]] = await pool.execute(`
    SELECT
      COUNT(*) AS totalUsers,
      COUNT(CASE WHEN role = 'agent' THEN 1 END) AS totalAgents
    FROM users
    WHERE is_active = 1
  `);

  const [[clients]] = await pool.execute(`
    SELECT COUNT(*) AS totalClients
    FROM clients
  `);

  const [[tickets]] = await pool.execute(`
    SELECT
      COUNT(*) AS totalTickets,
      COUNT(CASE WHEN status = 'open' THEN 1 END) AS openTickets,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pendingTickets,
      COUNT(CASE WHEN status = 'closed' THEN 1 END) AS closedTickets
    FROM tickets
    WHERE is_deleted = 0
  `);

  return {
    totalUsers: users.totalUsers,
    totalClients: clients.totalClients,
    totalAgents: users.totalAgents,
    totalTickets: tickets.totalTickets,
    openTickets: tickets.openTickets,
    pendingTickets: tickets.pendingTickets,
    closedTickets: tickets.closedTickets,
  };
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getAllClients,
  createClient,
  updateClient,
  deleteClient,
  getDashboardStats,
};