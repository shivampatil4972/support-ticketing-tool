const pool = require("../config/database");
const { calculateSlaDueDate, formatSlaStatus } = require("../utils/sla");
const { httpError } = require("../utils/response");
const { recordEvent } = require("./eventService");

const MAX_PAGE_SIZE = 100;

// How long after closing a client may reopen their ticket
const REOPEN_WINDOW_DAYS = Number(process.env.REOPEN_WINDOW_DAYS || 7);

const STATUSES = ["open", "pending", "closed"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

// Whitelisted ORDER BY clauses for ticket lists
const SORTS = {
  newest: "t.created_at DESC",
  oldest: "t.created_at ASC",
  due: "t.status = 'closed' ASC, t.sla_due_date ASC",
  priority:
    "FIELD(t.priority, 'urgent', 'high', 'medium', 'low'), t.created_at DESC",
};

const canReopen = (ticket) =>
  ticket.status === "closed" &&
  Boolean(ticket.closed_at) &&
  Date.now() - new Date(ticket.closed_at).getTime() <=
    REOPEN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

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
  createdBy,
  attachmentPath = null,
}) => {
  const dueDate = calculateSlaDueDate(priority);

  const [result] = await pool.execute(
    `INSERT INTO tickets
    (title, description, attachment_path, priority, status, client_id, created_by, sla_due_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [
      title,
      description,
      attachmentPath,
      priority,
      "open",
      clientId,
      createdBy,
      dueDate,
    ],
  );

  await recordEvent({
    ticketId: result.insertId,
    userId: createdBy,
    type: "created",
  });

  return {
    id: result.insertId,
    title,
    description,
    attachment_path: attachmentPath,
    priority,
    status: "open",
    client_id: clientId,
    created_by: createdBy,
    sla_due_date: dueDate,
  };
};

// ==============================
// Paginated ticket listing shared by every list endpoint
// ==============================
// `filters` come straight from the query string: page, limit, search,
// status, priority, sla ("overdue") and sort. Unknown values are ignored.
const listTickets = async ({ conditions, params, filters = {} }) => {
  const { page, limit, search, status, priority, sla, sort } = filters;

  const safePage = Math.max(1, Math.floor(Number(page)) || 1);
  const safeLimit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(Number(limit)) || 10),
  );
  const offset = (safePage - 1) * safeLimit;

  const where = ["t.is_deleted = 0", ...conditions];
  const whereParams = [...params];

  // Search by title or description
  if (typeof search === "string" && search) {
    where.push("(t.title LIKE ? OR t.description LIKE ?)");
    whereParams.push(`%${search}%`, `%${search}%`);
  }

  if (STATUSES.includes(status)) {
    where.push("t.status = ?");
    whereParams.push(status);
  }

  if (PRIORITIES.includes(priority)) {
    where.push("t.priority = ?");
    whereParams.push(priority);
  }

  if (sla === "overdue") {
    where.push("t.status <> 'closed' AND t.sla_due_date < UTC_TIMESTAMP()");
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const orderSql = SORTS[sort] || SORTS.newest;

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
      c.organization_name,
      agent.name AS agentName
    FROM tickets t
    JOIN clients c
      ON c.id = t.client_id
    LEFT JOIN users agent
      ON agent.id = t.assigned_agent_id
    ${whereSql}
    ORDER BY ${orderSql}
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
const getTicketsForUser = async (user, filters) => {
  const conditions = [];
  const params = [];

  if (user.role === "client") {
    conditions.push("t.client_id = ?");
    params.push(user.client_id);
  } else if (user.role === "agent") {
    conditions.push("(t.assigned_agent_id = ? OR t.assigned_agent_id IS NULL)");
    params.push(user.id);
  }

  return listTickets({ conditions, params, filters });
};

// ==============================
// Assigned Tickets
// ==============================
const getAssignedTickets = async (user, filters) =>
  listTickets({
    conditions: ["t.assigned_agent_id = ?"],
    params: [user.id],
    filters,
  });

// ==============================
// Unassigned Tickets
// ==============================
const getUnassignedTickets = async (filters) =>
  listTickets({
    conditions: ["t.assigned_agent_id IS NULL"],
    params: [],
    filters,
  });

// ==============================
// Get Ticket By ID
// ==============================
const getTicketById = async (id, user) => {
  // clientName is the ticket's creator. Tickets from before created_by
  // existed may have none, so fall back to the organization's first client.
  const [rows] = await pool.execute(
    `
    SELECT
      t.*,
      c.organization_name,
      agent.name AS agentName,
      COALESCE(
        creator.name,
        (
          SELECT u.name
          FROM users u
          WHERE u.client_id = t.client_id
            AND u.role = 'client'
          ORDER BY u.id ASC
          LIMIT 1
        )
      ) AS clientName
    FROM tickets t
    JOIN clients c
      ON c.id = t.client_id
    LEFT JOIN users agent
      ON agent.id = t.assigned_agent_id
    LEFT JOIN users creator
      ON creator.id = t.created_by
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

  return {
    ...withSlaStatus(ticket),
    can_reopen: canReopen(ticket),
  };
};

// ==============================
// Add Comment
// ==============================
// `ticket` must come from getTicketById, which has already checked access.
const addComment = async ({
  ticket,
  user,
  message,
  isInternal = false,
  attachmentPath = null,
}) => {
  const isPublicClientReply = !isInternal && user.role === "client";
  const isPublicStaffReply = !isInternal && user.role !== "client";

  if (isPublicClientReply && ticket.status === "closed") {
    throw httpError(400, "This ticket is closed. Reopen it to reply.");
  }

  const [result] = await pool.execute(
    `INSERT INTO comments
    (ticket_id, user_id, message, attachment_path, is_internal, created_at)
    VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [ticket.id, user.id, message, attachmentPath, isInternal],
  );

  let status = ticket.status;

  // The first public reply from support stops the first-response clock
  if (isPublicStaffReply && !ticket.first_response_at) {
    await pool.execute(
      `UPDATE tickets
       SET first_response_at = UTC_TIMESTAMP()
       WHERE id = ?
         AND first_response_at IS NULL`,
      [ticket.id],
    );
  }

  // A pending ticket is waiting on the client, so their reply reopens it
  if (isPublicClientReply && ticket.status === "pending") {
    status = "open";

    await pool.execute(
      `UPDATE tickets
       SET status = 'open',
           updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [ticket.id],
    );

    await recordEvent({
      ticketId: ticket.id,
      userId: user.id,
      type: "status_changed",
      from: "pending",
      to: "open",
    });
  }

  // Fetch client and assigned agent details for notification emails. The
  // client is the ticket's creator, else the organization's first client.
  const [rows] = await pool.execute(
    `SELECT
        COALESCE(creator.name, client.name) AS clientName,
        COALESCE(creator.email, client.email) AS clientEmail,

        agent.name AS agentName,
        agent.email AS agentEmail

     FROM tickets t

     JOIN clients c
       ON t.client_id = c.id

     LEFT JOIN users creator
       ON creator.id = t.created_by
       AND creator.is_active = 1

     LEFT JOIN users client
       ON client.client_id = c.id
       AND client.role = 'client'
       AND client.is_active = 1

     LEFT JOIN users agent
       ON agent.id = t.assigned_agent_id

     WHERE t.id = ?

     ORDER BY client.id ASC

     LIMIT 1`,
    [ticket.id],
  );

  const contacts = rows[0] || {};

  return {
    id: result.insertId,
    ticket_id: ticket.id,
    user_id: user.id,
    title: ticket.title,
    message,
    attachment_path: attachmentPath,
    is_internal: isInternal,
    ticket_status: status,

    clientName: contacts.clientName ?? null,
    clientEmail: contacts.clientEmail ?? null,

    agentName: contacts.agentName ?? null,
    agentEmail: contacts.agentEmail ?? null,
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
// Find a ticket for a write operation (no access rules applied)
// ==============================
const findTicket = async (id) => {
  const [rows] = await pool.execute(
    `
    SELECT
      t.id,
      t.title,
      t.priority,
      t.status,
      t.client_id,
      t.created_by,
      t.assigned_agent_id,
      t.closed_at,
      agent.name AS agentName
    FROM tickets t
    LEFT JOIN users agent
      ON agent.id = t.assigned_agent_id
    WHERE
      t.id = ?
      AND t.is_deleted = 0
    LIMIT 1
    `,
    [id],
  );

  if (!rows.length) {
    throw httpError(404, "Ticket not found");
  }

  return rows[0];
};

// ==============================
// Update Ticket Status
// ==============================
const updateTicketStatus = async (id, status, user) => {
  const ticket = await findTicket(id);

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

  const changed = ticket.status !== status;

  if (changed) {
    // closed_at marks when the ticket was closed and clears on any other status
    await pool.execute(
      `
      UPDATE tickets
      SET
        status = ?,
        closed_at = IF(? = 'closed', UTC_TIMESTAMP(), NULL),
        updated_at = UTC_TIMESTAMP()
      WHERE
        id = ?
        AND is_deleted = 0
      `,
      [status, status, id],
    );

    await recordEvent({
      ticketId: ticket.id,
      userId: user.id,
      type: "status_changed",
      from: ticket.status,
      to: status,
    });
  }

  return {
    id: ticket.id,
    title: ticket.title,
    status,
    previousStatus: ticket.status,
    changed,
    client_id: ticket.client_id,
    created_by: ticket.created_by,
    assigned_agent_id: ticket.assigned_agent_id,
  };
};

// ==============================
// Reopen Ticket
// ==============================
// Clients may reopen their own ticket for REOPEN_WINDOW_DAYS after it
// closes. The SLA clock restarts from now.
const reopenTicket = async (id, user) => {
  // Throws unless the user may view this ticket
  const ticket = await getTicketById(id, user);

  if (ticket.status !== "closed") {
    throw httpError(400, "Only closed tickets can be reopened");
  }

  if (user.role === "client" && !ticket.can_reopen) {
    throw httpError(
      400,
      `Tickets can only be reopened within ${REOPEN_WINDOW_DAYS} days of closing. Please create a new ticket.`,
    );
  }

  const dueDate = calculateSlaDueDate(ticket.priority);

  await pool.execute(
    `
    UPDATE tickets
    SET
      status = 'open',
      closed_at = NULL,
      sla_due_date = ?,
      updated_at = UTC_TIMESTAMP()
    WHERE
      id = ?
      AND is_deleted = 0
    `,
    [dueDate, ticket.id],
  );

  await recordEvent({
    ticketId: ticket.id,
    userId: user.id,
    type: "reopened",
    from: "closed",
    to: "open",
  });

  return {
    id: ticket.id,
    title: ticket.title,
    status: "open",
    sla_due_date: dueDate,
    client_id: ticket.client_id,
    created_by: ticket.created_by,
    assigned_agent_id: ticket.assigned_agent_id,
  };
};

// ==============================
// Assign, Reassign or Unassign Ticket (admin)
// ==============================
// A null assignedAgentId returns the ticket to the unassigned queue.
const assignTicket = async (id, assignedAgentId, actor) => {
  const ticket = await findTicket(id);

  let agent = null;

  if (assignedAgentId !== null) {
    // Verify selected user is an active Agent
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

    agent = agents[0];
  }

  const newAgentId = agent ? agent.id : null;
  const changed = ticket.assigned_agent_id !== newAgentId;

  if (changed) {
    await pool.execute(
      `UPDATE tickets
       SET assigned_agent_id = ?,
           updated_at = UTC_TIMESTAMP()
       WHERE id = ?
         AND is_deleted = 0`,
      [newAgentId, id],
    );

    await recordEvent({
      ticketId: ticket.id,
      userId: actor.id,
      type: agent ? "assigned" : "unassigned",
      from: ticket.agentName,
      to: agent ? agent.name : null,
    });
  }

  return {
    id: ticket.id,
    changed,
    assigned_agent_id: newAgentId,
    previousAgentId: ticket.assigned_agent_id,
    agentName: agent ? agent.name : null,
    agentEmail: agent ? agent.email : null,
    ticketTitle: ticket.title,
    priority: ticket.priority,
    status: ticket.status,
  };
};

// ==============================
// Claim Ticket (agent takes an unassigned ticket)
// ==============================
const claimTicket = async (id, agent) => {
  // The IS NULL guard makes the claim atomic: two agents cannot both win
  const [result] = await pool.execute(
    `UPDATE tickets
     SET assigned_agent_id = ?,
         updated_at = UTC_TIMESTAMP()
     WHERE id = ?
       AND is_deleted = 0
       AND assigned_agent_id IS NULL`,
    [agent.id, id],
  );

  if (result.affectedRows === 0) {
    // Either the ticket is gone (404) or someone else has it
    await findTicket(id);

    throw httpError(409, "This ticket has already been assigned");
  }

  await recordEvent({
    ticketId: Number(id),
    userId: agent.id,
    type: "claimed",
    to: agent.name,
  });

  return {
    id: Number(id),
    assigned_agent_id: agent.id,
    agentName: agent.name,
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
  reopenTicket,
  assignTicket,
  claimTicket,
  deleteTicket,
  getAssignedTickets,
  getUnassignedTickets,
  getAgentDashboardStats,
  getClientDashboardStats,
};
