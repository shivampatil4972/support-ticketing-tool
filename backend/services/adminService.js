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

  if (typeof fields.email === "string") {
    fields = { ...fields, email: fields.email.trim().toLowerCase() };
  }

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

// ==============================
// AGENT PERFORMANCE
// ==============================

// Per-ticket metric columns, shared by the per-agent and overall queries
const METRIC_COLUMNS = `
  COUNT(t.id) AS totalTickets,
  COUNT(CASE WHEN t.status <> 'closed' THEN 1 END) AS activeTickets,
  COUNT(CASE WHEN t.status = 'closed' THEN 1 END) AS closedTickets,
  COUNT(CASE WHEN t.status <> 'closed' AND t.sla_due_date < UTC_TIMESTAMP() THEN 1 END) AS overdueTickets,
  AVG(TIMESTAMPDIFF(MINUTE, t.created_at, t.first_response_at)) AS avgFirstResponseMinutes,
  AVG(CASE WHEN t.status = 'closed' THEN TIMESTAMPDIFF(MINUTE, t.created_at, t.closed_at) END) AS avgResolutionMinutes,
  COUNT(CASE WHEN t.status = 'closed' AND t.closed_at <= t.sla_due_date THEN 1 END) AS closedWithinSla
`;

// MySQL returns AVG as a decimal string, and NULL when there is no data
const toMetrics = (row) => ({
  totalTickets: row.totalTickets,
  activeTickets: row.activeTickets,
  closedTickets: row.closedTickets,
  overdueTickets: row.overdueTickets,
  avgFirstResponseMinutes:
    row.avgFirstResponseMinutes === null
      ? null
      : Math.round(Number(row.avgFirstResponseMinutes)),
  avgResolutionMinutes:
    row.avgResolutionMinutes === null
      ? null
      : Math.round(Number(row.avgResolutionMinutes)),
  // Share of closed tickets that were closed before their SLA due date
  slaHitRate: row.closedTickets
    ? Math.round((row.closedWithinSla / row.closedTickets) * 100)
    : null,
});

const getAgentPerformance = async () => {
  const [agentRows] = await pool.execute(`
    SELECT
      u.id,
      u.name,
      u.email,
      ${METRIC_COLUMNS}
    FROM users u
    LEFT JOIN tickets t
      ON t.assigned_agent_id = u.id
      AND t.is_deleted = 0
    WHERE u.role = 'agent'
      AND u.is_active = 1
    GROUP BY u.id, u.name, u.email
    ORDER BY u.name ASC
  `);

  const [[overallRow]] = await pool.execute(`
    SELECT
      ${METRIC_COLUMNS},
      COUNT(CASE WHEN t.assigned_agent_id IS NULL AND t.status <> 'closed' THEN 1 END) AS unassignedTickets
    FROM tickets t
    WHERE t.is_deleted = 0
  `);

  return {
    overall: {
      ...toMetrics(overallRow),
      unassignedTickets: overallRow.unassignedTickets,
    },
    agents: agentRows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      ...toMetrics(row),
    })),
  };
};

module.exports = {
  getAgentPerformance,
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