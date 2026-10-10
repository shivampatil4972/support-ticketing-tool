const pool = require("../config/database");

// ==============================
// Record a ticket event (audit timeline)
// ==============================
const recordEvent = async ({
  ticketId,
  userId = null,
  type,
  from = null,
  to = null,
}) => {
  await pool.execute(
    `INSERT INTO ticket_events
    (ticket_id, user_id, type, from_value, to_value, created_at)
    VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [ticketId, userId, type, from, to],
  );
};

// ==============================
// Get a ticket's events, oldest first
// ==============================
const getEvents = async (ticketId) => {
  const [rows] = await pool.execute(
    `
    SELECT
      e.id,
      e.type,
      e.from_value,
      e.to_value,
      e.created_at,
      u.name AS userName,
      u.role AS userRole
    FROM ticket_events e
    LEFT JOIN users u
      ON u.id = e.user_id
    WHERE e.ticket_id = ?
    ORDER BY e.created_at ASC, e.id ASC
    `,
    [ticketId],
  );

  return rows;
};

module.exports = { recordEvent, getEvents };
