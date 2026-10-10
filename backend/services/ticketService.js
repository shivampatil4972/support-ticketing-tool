const pool = require("../config/database");
const { calculateSlaDueDate, formatSlaStatus } = require("../utils/sla");
const { httpError } = require("../utils/response");

const MAX_PAGE_SIZE = 100;

const withSlaStatus = (ticket) => ({
  ...ticket,
  sla_status: formatSlaStatus(ticket.sla_due_date, ticket.status),
});

// ==============================
// Create Ticket
// ==============================
const createTicket = async ({
  title,
  description,
  priority,
  clientId,
  attachmentPath = null,
}) => {
  const dueDate = calculateSlaDueDate(priority);

  const [result] = await pool.execute(
    `INSERT INTO tickets
    (title, description, attachment_path, priority, status, client_id, sla_due_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [title, description, attachmentPath, priority, "open", clientId, dueDate],
  );

  return {
    id: result.insertId,
    title,
    description,
    attachment_path: attachmentPath,
    priority,
    status: "open",
    client_id: clientId,
    sla_due_date: dueDate,
  };
};

// ==============================
// Paginated ticket listing shared by every list endpoint
// ==============================
const listTickets = async ({ conditions, params, page, limit, search }) => {
  const safePage = Math.max(1, Math.floor(Number(page)) || 1);
  const safeLimit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(Number(limit)) || 10),
  );
  const offset = (safePage - 1) * safeLimit;

  const where = ["t.is_deleted = 0", ...conditions];
  const whereParams = [...params];

  // Search by title or description
  if (search) {
    where.push("(t.title LIKE ? OR t.description LIKE ?)");
    whereParams.push(`%${search}%`, `%${search}%`);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const [countRows] = await pool.execute(
    `
    SELECT COUNT(*) AS total
    FROM tickets t
    ${whereSql}
    `,
    whereParams,
  );

  const total = countRows[0].total;

  const [rows] = await pool.query(
    `
    SELECT
      t.*,
      c.organization_name
    FROM tickets t
    JOIN clients c
      ON c.id = t.client_id
    ${whereSql}
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?
    `,
    [...whereParams, safeLimit, offset],
  );

  return {
    tickets: rows.map(withSlaStatus),

    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

// ==============================
// Get Tickets (Pagination)
// ==============================
const getTicketsForUser = async (user, page = 1, limit = 10, search = "") => {
  const conditions = [];
  const params = [];

  if (user.role === "client") {
    conditions.push("t.client_id = ?");
    params.push(user.client_id);
  } else if (user.role === "agent") {
    conditions.push("(t.assigned_agent_id = ? OR t.assigned_agent_id IS NULL)");
    params.push(user.id);
  }

  return listTickets({ conditions, params, page, limit, search });
};

// ==============================
// Assigned Tickets
// ==============================
const getAssignedTickets = async (user, page = 1, limit = 10, search = "") =>
  listTickets({
    conditions: ["t.assigned_agent_id = ?"],
    params: [user.id],
    page,
    limit,
    search,
  });

// ==============================
// Unassigned Tickets
// ==============================
const getUnassignedTickets = async (page = 1, limit = 10, search = "") =>
  listTickets({
    conditions: ["t.assigned_agent_id IS NULL"],
    params: [],
    page,
    limit,
    search,
  });

// ==============================
// Get Ticket By ID
// ==============================
const getTicketById = async (id, user) => {
  // Tickets belong to an organization, not a single user, so clientName is
  // the organization's first client account.
  const [rows] = await pool.execute(
    `
    SELECT
      t.*,
      c.organization_name,
      agent.name AS agentName,
      (
        SELECT u.name
        FROM users u
        WHERE u.client_id = t.client_id
          AND u.role = 'client'
        ORDER BY u.id ASC
        LIMIT 1
      ) AS clientName
    FROM tickets t
    JOIN clients c
      ON c.id = t.client_id
    LEFT JOIN users agent
      ON agent.id = t.assigned_agent_id
    WHERE
      t.id = ?
      AND t.is_deleted = 0
    `,
    [id],
  );

  if (!rows.length) {
    throw httpError(404, "Ticket not found");
  }

  const ticket = rows[0];

  // Client can only view their own tickets
  if (user.role === "client" && ticket.client_id !== user.client_id) {
    throw httpError(403, "Forbidden");
  }

  // Agent can only view tickets assigned to them
  // OR currently unassigned tickets
  if (
    user.role === "agent" &&
    ticket.assigned_agent_id !== null &&
    ticket.assigned_agent_id !== user.id
  ) {
    throw httpError(403, "Forbidden");
  }

  return withSlaStatus(ticket);
};

// ==============================
// Add Comment
// ==============================
const addComment = async ({
  ticketId,
  userId,
  message,
  isInternal = false,
  attachmentPath = null,
}) => {
  const [result] = await pool.execute(
    `INSERT INTO comments
    (ticket_id, user_id, message, attachment_path, is_internal, created_at)
    VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [ticketId, userId, message, attachmentPath, isInternal],
  );

  // Fetch ticket, client and assigned agent details
  const [rows] = await pool.execute(
    `SELECT
        t.id,
        t.title,

        client.name AS clientName,
        client.email AS clientEmail,

        agent.name AS agentName,
        agent.email AS agentEmail

     FROM tickets t

     JOIN clients c
       ON t.client_id = c.id

     LEFT JOIN users client
       ON client.client_id = c.id
       AND client.role = 'client'
       AND client.is_active = 1

     LEFT JOIN users agent
       ON agent.id = t.assigned_agent_id

     WHERE t.id = ?

     LIMIT 1`,
    [ticketId],
  );

  if (!rows.length) {
    throw httpError(404, "Ticket not found");
  }

  return {
    id: result.insertId,
    ticket_id: ticketId,
    user_id: userId,
    title: rows[0].title,
    message,
    attachment_path: attachmentPath,
    is_internal: isInternal,

    clientName: rows[0].clientName,
    clientEmail: rows[0].clientEmail,

    agentName: rows[0].agentName,
    agentEmail: rows[0].agentEmail,
  };
};

// ==============================
// Get Comments
// ==============================
const getComments = async (ticketId, user) => {
  let query = `
    SELECT c.*, u.name, u.role
    FROM comments c
    JOIN users u
      ON u.id = c.user_id
    WHERE c.ticket_id = ?
  `;

  const params = [ticketId];

  // Client must never see internal notes
  if (user.role === "client") {
    query += " AND c.is_internal = 0";
  }

  query += " ORDER BY c.created_at ASC";

  const [rows] = await pool.execute(query, params);

  return rows;
};

// ==============================
// Get Comment Attachment
// ==============================
// Caller must already have verified access to the ticket.
const getCommentAttachment = async (ticketId, commentId, user) => {
  const [rows] = await pool.execute(
    `
    SELECT attachment_path, is_internal
    FROM comments
    WHERE id = ?
      AND ticket_id = ?
    `,
    [commentId, ticketId],
  );

  const comment = rows[0];

  // Client must never see internal notes, so report them as missing
  if (
    !comment ||
    !comment.attachment_path ||
    (user.role === "client" && comment.is_internal)
  ) {
    throw httpError(404, "Attachment not found");
  }

  return comment.attachment_path;
};

// ==============================
// Update Ticket Status
// ==============================
const updateTicketStatus = async (id, status, user) => {
  // First find the ticket
  const [ticketRows] = await pool.execute(
    `
    SELECT
      t.id,
      t.title,
      t.status,
      t.client_id,
      t.assigned_agent_id
    FROM tickets t
    WHERE
      t.id = ?
      AND t.is_deleted = 0
    LIMIT 1
    `,
    [id],
  );

  // Ticket does not exist
  if (!ticketRows.length) {
    throw httpError(404, "Ticket not found");
  }

  const ticket = ticketRows[0];

  // Only admin or agent can change status
  if (user.role !== "admin" && user.role !== "agent") {
    throw httpError(403, "Only admin or agent can change ticket status");
  }

  // Agent can change status only for their assigned ticket
  if (
    user.role === "agent" &&
    Number(ticket.assigned_agent_id) !== Number(user.id)
  ) {
    throw httpError(403, "You are not authorized to update this ticket");
  }

  // Update status
  await pool.execute(
    `
    UPDATE tickets
    SET
      status = ?,
      updated_at = UTC_TIMESTAMP()
    WHERE
      id = ?
      AND is_deleted = 0
    `,
    [status, id],
  );

  // Client details are optional: an organization may have no client user
  const [rows] = await pool.execute(
    `
    SELECT
      u.name,
      u.email
    FROM users u
    WHERE
      u.client_id = ?
      AND u.role = 'client'
    ORDER BY u.id ASC
    LIMIT 1
    `,
    [ticket.client_id],
  );

  return {
    id: ticket.id,
    title: ticket.title,
    status,
    clientName: rows[0]?.name ?? null,
    clientEmail: rows[0]?.email ?? null,
  };
};

// ==============================
// Assign Ticket
// ==============================
const assignTicket = async (id, assignedAgentId) => {
  // ==============================
  // Verify selected user is an active Agent
  // ==============================
  const [agents] = await pool.execute(
    `SELECT
        id,
        name,
        email
     FROM users
     WHERE id = ?
       AND role = 'agent'
       AND is_active = 1`,
    [assignedAgentId],
  );

  if (!agents.length) {
    throw httpError(400, "Selected user is not a valid agent");
  }

  // ==============================
  // Verify ticket exists
  // ==============================
  const [tickets] = await pool.execute(
    `SELECT id, title, priority, status
     FROM tickets
     WHERE id = ?
       AND is_deleted = 0`,
    [id],
  );

  if (!tickets.length) {
    throw httpError(404, "Ticket not found");
  }

  // ==============================
  // Update assignment
  // ==============================
  await pool.execute(
    `UPDATE tickets
     SET assigned_agent_id = ?,
         updated_at = UTC_TIMESTAMP()
     WHERE id = ?
       AND is_deleted = 0`,
    [assignedAgentId, id],
  );

  return {
    id: tickets[0].id,
    assigned_agent_id: agents[0].id,
    agentName: agents[0].name,
    agentEmail: agents[0].email,
    ticketTitle: tickets[0].title,
    priority: tickets[0].priority,
    status: tickets[0].status,
  };
};

// ==============================
// Soft Delete Ticket
// ==============================
const deleteTicket = async (id) => {
  const [result] = await pool.execute(
    `UPDATE tickets
     SET is_deleted = 1,
         updated_at = UTC_TIMESTAMP()
     WHERE id = ?
       AND is_deleted = 0`,
    [id],
  );

  if (result.affectedRows === 0) {
    throw httpError(404, "Ticket not found");
  }

  return {
    id,
    message: "Ticket deleted successfully",
  };
};

// ==============================
// Ticket counts by status for one owner column
// ==============================
const getStatusCounts = async (column, value) => {
  const [[counts]] = await pool.execute(
    `
    SELECT
      COUNT(*) AS totalTickets,
      COUNT(CASE WHEN status = 'open' THEN 1 END) AS openTickets,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pendingTickets,
      COUNT(CASE WHEN status = 'closed' THEN 1 END) AS closedTickets
    FROM tickets
    WHERE ${column} = ?
      AND is_deleted = 0
    `,
    [value],
  );

  return counts;
};

// ==============================
// Agent Dashboard Stats
// ==============================
const getAgentDashboardStats = async (agentId) => {
  const counts = await getStatusCounts("assigned_agent_id", agentId);

  return {
    assignedTickets: counts.totalTickets,
    pendingTickets: counts.pendingTickets,
    closedTickets: counts.closedTickets,
  };
};

// ==============================
// Client Dashboard Stats
// ==============================
const getClientDashboardStats = async (clientId) =>
  getStatusCounts("client_id", clientId);

// ==============================
// EXPORTS
// ==============================
module.exports = {
  createTicket,
  getTicketsForUser,
  getTicketById,
  addComment,
  getComments,
  getCommentAttachment,
  updateTicketStatus,
  assignTicket,
  deleteTicket,
  getAssignedTickets,
  getUnassignedTickets,
  getAgentDashboardStats,
  getClientDashboardStats,
};
