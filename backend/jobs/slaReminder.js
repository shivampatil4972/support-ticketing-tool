const cron = require("node-cron");
const pool = require("../config/database");
const { sendEmail } = require("../utils/email");
const { slaReminderEmail } = require("../utils/emailTemplates");
const { notifyUsers } = require("../services/notificationService");

// Ticket ids already reminded, so each ticket gets one email per SLA window
// instead of one every run. Kept in memory: a restart may repeat a reminder.
const reminded = new Set();

cron.schedule("*/5 * * * *", async () => {
  try {
    const [tickets] = await pool.execute(`
      SELECT
        t.id,
        t.title,
        t.priority,
        t.status,
        t.sla_due_date,
        u.id AS agentId,
        u.name AS agentName,
        u.email AS agentEmail
      FROM tickets t
      JOIN users u
        ON t.assigned_agent_id = u.id
      WHERE
        t.status IN ('open', 'pending')
        AND t.is_deleted = 0
        AND t.assigned_agent_id IS NOT NULL
        AND t.sla_due_date > UTC_TIMESTAMP()
        AND t.sla_due_date <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR)
    `);

    // Forget tickets that have left the window (closed, deleted or expired)
    const dueIds = new Set(tickets.map((ticket) => ticket.id));

    for (const id of reminded) {
      if (!dueIds.has(id)) reminded.delete(id);
    }

    for (const ticket of tickets) {
      if (reminded.has(ticket.id)) continue;

      reminded.add(ticket.id);

      await notifyUsers([ticket.agentId], {
        ticketId: ticket.id,
        type: "sla_due",
        message: `SLA due within the hour: ${ticket.title}`,
      });

      await sendEmail(slaReminderEmail(ticket));
    }
  } catch (err) {
    console.error("SLA Reminder Error:", err);
  }
});
