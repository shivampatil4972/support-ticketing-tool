const pool = require("../config/database");
const { httpError } = require("../utils/response");

const LIST_LIMIT = 20;

// ==============================
// Create one notification per recipient
// ==============================
// Never throws: a notification must not fail the request that caused it.
// `exclude` is the acting user, who does not need telling what they just did.
const notifyUsers = async (userIds, { ticketId = null, type, message }, exclude = null) => {
  try {
    const recipients = [...new Set(userIds)].filter(
      (id) => id !== null && id !== undefined && id !== exclude,
    );

    if (!recipients.length) return;

    await pool.query(
      `INSERT INTO notifications
      (user_id, ticket_id, type, message, created_at)
      VALUES ?`,
      [
        recipients.map((userId) => [
          userId,
          ticketId,
          type,
          message.slice(0, 500),
          new Date(),
        ]),
      ],
    );
  } catch (err) {
    console.error("Notification failed:", err.message);
  }
};

// ==============================
// Who to notify on the client side of a ticket
// ==============================
// The ticket's creator, or every active client user of the organization
// for tickets from before creators were recorded.
const getClientRecipients = async (ticket) => {
  if (ticket.created_by) return [ticket.created_by];

  const [rows] = await pool.execute(
    `SELECT id
     FROM users
     WHERE client_id = ?
       AND role = 'client'
       AND is_active = 1`,
    [ticket.client_id],
  );

  return rows.map((row) => row.id);
};

const getAdminRecipients = async () => {
  const [rows] = await pool.execute(
    `SELECT id
     FROM users
     WHERE role = 'admin'
       AND is_active = 1`,
  );

  return rows.map((row) => row.id);
};

// ==============================
// A user's latest notifications and unread count
// ==============================
const getNotifications = async (userId) => {
  const [notifications] = await pool.execute(
    `
    SELECT id, ticket_id, type, message, is_read, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY id DESC
    LIMIT ${LIST_LIMIT}
    `,
    [userId],
  );

  const [[counts]] = await pool.execute(
    `
    SELECT COUNT(*) AS unreadCount
    FROM notifications
    WHERE user_id = ?
      AND is_read = 0
    `,
    [userId],
  );

  return { notifications, unreadCount: counts.unreadCount };
};

const markRead = async (id, userId) => {
  const [result] = await pool.execute(
    `UPDATE notifications
     SET is_read = 1
     WHERE id = ?
       AND user_id = ?`,
    [id, userId],
  );

  if (result.affectedRows === 0) {
    throw httpError(404, "Notification not found");
  }

  return { id };
};

const markAllRead = async (userId) => {
  await pool.execute(
    `UPDATE notifications
     SET is_read = 1
     WHERE user_id = ?
       AND is_read = 0`,
    [userId],
  );
};

module.exports = {
  notifyUsers,
  getClientRecipients,
  getAdminRecipients,
  getNotifications,
  markRead,
  markAllRead,
};
