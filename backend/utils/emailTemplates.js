// ==============================
// Helper - Escape HTML
// ==============================
const escapeHtml = (value) => {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Renders [label, value] pairs as a bordered table
const detailsTable = (rows) => `
  <table
    border="1"
    cellpadding="10"
    cellspacing="0"
    style="border-collapse:collapse;width:100%;"
  >
    ${rows
      .map(
        ([label, value]) => `
    <tr>
      <td><strong>${escapeHtml(label)}</strong></td>
      <td>${escapeHtml(value)}</td>
    </tr>`,
      )
      .join("")}
  </table>
`;

const layout = (body) => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
    <h2 style="color:#2563eb;">Support Ticket System</h2>
    ${body}
    <br>
    <strong>Support Ticket Team</strong>
  </div>
`;

// ==============================
// Welcome
// ==============================
const welcomeEmail = (user) => ({
  to: user.email,
  subject: "Welcome to Support Ticket System",
  html: layout(`
    <p>Welcome <strong>${escapeHtml(user.name)}</strong>! 🎉</p>
    <p>Your account has been created successfully.</p>
    <p>You can now login and start using the <b>Support Ticket System</b>.</p>
  `),
});

// ==============================
// Ticket Created
// ==============================
const ticketCreatedEmail = (to, ticket) => ({
  to,
  subject: `Ticket Created Successfully (#${ticket.id})`,
  html: layout(`
    <p>Your ticket has been created successfully 🎉</p>
    ${detailsTable([
      ["Ticket ID", ticket.id],
      ["Title", ticket.title],
      ["Description", ticket.description],
      ["Priority", ticket.priority],
      ["Status", ticket.status],
    ])}
    <p>Our support team will review your request shortly.</p>
  `),
});

// ==============================
// Client replied → notify agent
// ==============================
const clientReplyEmail = (comment) => ({
  to: comment.agentEmail,
  subject: `New Reply on Ticket #${comment.ticket_id}`,
  html: layout(`
    <p>Hello <strong>${escapeHtml(comment.agentName)}</strong>,</p>
    <p>A client has replied to a support ticket assigned to you.</p>
    ${detailsTable([
      ["Ticket ID", comment.ticket_id],
      ["Title", comment.title],
      ["Reply", comment.message],
    ])}
    <p>Please login to the Support Ticket System to continue assisting the client.</p>
  `),
});

// ==============================
// Agent replied → notify client
// ==============================
const agentReplyEmail = (comment) => ({
  to: comment.clientEmail,
  subject: `Update on Your Ticket #${comment.ticket_id}`,
  html: layout(`
    <p>Hello <strong>${escapeHtml(comment.clientName)}</strong>,</p>
    <p>Your support ticket has received a new reply.</p>
    ${detailsTable([
      ["Ticket ID", comment.ticket_id],
      ["Title", comment.title],
      ["Reply", comment.message],
    ])}
    <p>Please login to the Support Ticket System to view the complete conversation.</p>
  `),
});

// ==============================
// Ticket Assigned
// ==============================
const ticketAssignedEmail = (result) => ({
  to: result.agentEmail,
  subject: `New Ticket Assigned (#${result.id})`,
  html: layout(`
    <p>Hello <strong>${escapeHtml(result.agentName)}</strong>,</p>
    <p>A new support ticket has been assigned to you.</p>
    ${detailsTable([
      ["Ticket ID", `#${result.id}`],
      ["Title", result.ticketTitle],
      ["Priority", result.priority],
      ["Status", result.status],
    ])}
    <p>Please log in to the Support Ticket System and start working on this ticket.</p>
  `),
});

// ==============================
// SLA Reminder
// ==============================
const slaReminderEmail = (ticket) => ({
  to: ticket.agentEmail,
  subject: `SLA Reminder - Ticket #${ticket.id}`,
  html: layout(`
    <p>Hello <strong>${escapeHtml(ticket.agentName)}</strong>,</p>
    <p>This ticket is approaching its SLA deadline.</p>
    ${detailsTable([
      ["Ticket ID", ticket.id],
      ["Title", ticket.title],
      ["Priority", ticket.priority],
      ["SLA Due", ticket.sla_due_date],
    ])}
    <p>Please resolve this ticket before the SLA expires.</p>
  `),
});

module.exports = {
  escapeHtml,
  welcomeEmail,
  ticketCreatedEmail,
  clientReplyEmail,
  agentReplyEmail,
  ticketAssignedEmail,
  slaReminderEmail,
};
