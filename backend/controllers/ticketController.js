const path = require("path");

const { sendResponse, handle, httpError } = require("../utils/response");
const { sendEmail } = require("../utils/email");
const { uploadDir } = require("../middlewares/upload");

const {
  ticketCreatedEmail,
  clientReplyEmail,
  agentReplyEmail,
  ticketAssignedEmail,
} = require("../utils/emailTemplates");

const {
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
} = require("../services/ticketService");

const { getEvents } = require("../services/eventService");

const {
  notifyUsers,
  getClientRecipients,
  getAdminRecipients,
} = require("../services/notificationService");

// Notification emails must never fail or delay the request
const notify = (email) => {
  sendEmail(email).catch((err) =>
    console.error("Notification email failed:", err.message),
  );
};

// Streams a stored upload; basename() keeps the lookup inside uploadDir
const sendAttachment = (res, filename) =>
  new Promise((resolve, reject) => {
    res.sendFile(path.basename(filename), { root: uploadDir }, (err) => {
      if (!err) return resolve();
      if (res.headersSent) return resolve();
      reject(httpError(404, "Attachment not found"));
    });
  });

// ==============================
// Create Ticket
// ==============================
const create = handle(async (req, res) => {
  if (!req.user.client_id) {
    throw httpError(
      400,
      "User must have a client organization to create tickets",
    );
  }

  const ticket = await createTicket({
    title: req.body.title,
    description: req.body.description,
    priority: req.body.priority,
    clientId: req.user.client_id,
    createdBy: req.user.id,
    attachmentPath: req.file ? req.file.filename : null,
  });

  notify(ticketCreatedEmail(req.user.email, ticket));

  // Admins assign tickets, so they need to know a new one is waiting
  await notifyUsers(await getAdminRecipients(), {
    ticketId: ticket.id,
    type: "ticket_created",
    message: `New ${ticket.priority} priority ticket: ${ticket.title}`,
  });

  return sendResponse(res, 201, true, ticket, "Ticket created successfully");
}, "Failed to create ticket");

// ==============================
// Get All Tickets
// ==============================
const list = handle(async (req, res) => {
  const result = await getTicketsForUser(req.user, req.query);

  return sendResponse(res, 200, true, result, "Tickets retrieved successfully");
}, "Failed to retrieve tickets");

// ==============================
// Assigned Tickets
// ==============================
const assignedTickets = handle(async (req, res) => {
  const result = await getAssignedTickets(req.user, req.query);

  return sendResponse(
    res,
    200,
    true,
    result,
    "Assigned tickets retrieved successfully",
  );
}, "Failed to retrieve assigned tickets");

// ==============================
// Unassigned Tickets
// ==============================
const unassignedTickets = handle(async (req, res) => {
  const result = await getUnassignedTickets(req.query);

  return sendResponse(
    res,
    200,
    true,
    result,
    "Unassigned tickets retrieved successfully",
  );
}, "Failed to retrieve unassigned tickets");

// ==============================
// Get Ticket Details
// ==============================
const detail = handle(async (req, res) => {
  const ticket = await getTicketById(req.params.id, req.user);

  const comments = await getComments(req.params.id, req.user);

  const events = await getEvents(req.params.id);

  return sendResponse(
    res,
    200,
    true,
    {
      ticket,
      comments,
      events,
    },
    "Ticket retrieved successfully",
  );
}, "Failed to retrieve ticket");

// ==============================
// Download Ticket Attachment
// ==============================
const attachment = handle(async (req, res) => {
  const ticket = await getTicketById(req.params.id, req.user);

  if (!ticket.attachment_path) {
    throw httpError(404, "Attachment not found");
  }

  return sendAttachment(res, ticket.attachment_path);
}, "Failed to retrieve attachment");

// ==============================
// Download Comment Attachment
// ==============================
const commentAttachment = handle(async (req, res) => {
  // Throws unless the user may view this ticket
  await getTicketById(req.params.id, req.user);

  const filename = await getCommentAttachment(
    req.params.id,
    req.params.commentId,
    req.user,
  );

  return sendAttachment(res, filename);
}, "Failed to retrieve attachment");

// ==============================
// Reply to Ticket
// ==============================
const reply = handle(async (req, res) => {
  // Throws unless the user may view this ticket
  const ticket = await getTicketById(req.params.id, req.user);

  const comment = await addComment({
    ticket,
    user: req.user,
    message: req.body.message.trim(),
    isInternal: false,
    attachmentPath: req.file ? req.file.filename : null,
  });

  if (req.user.role === "client") {
    if (comment.agentEmail) notify(clientReplyEmail(comment));

    await notifyUsers([ticket.assigned_agent_id], {
      ticketId: ticket.id,
      type: "reply",
      message: `${req.user.name} replied on: ${ticket.title}`,
    });
  } else {
    if (req.user.role === "agent" && comment.clientEmail) {
      notify(agentReplyEmail(comment));
    }

    await notifyUsers(await getClientRecipients(ticket), {
      ticketId: ticket.id,
      type: "reply",
      message: `Support replied on your ticket: ${ticket.title}`,
    });
  }

  return sendResponse(res, 201, true, comment, "Reply added successfully");
}, "Failed to add reply");

// ==============================
// Internal Note
// ==============================
const internalNote = handle(async (req, res) => {
  // Throws unless the user may view this ticket
  const ticket = await getTicketById(req.params.id, req.user);

  const comment = await addComment({
    ticket,
    user: req.user,
    message: req.body.message.trim(),
    isInternal: true,
    attachmentPath: req.file ? req.file.filename : null,
  });

  // Notes are staff-only: tell the assigned agent, never the client
  await notifyUsers(
    [ticket.assigned_agent_id],
    {
      ticketId: ticket.id,
      type: "internal_note",
      message: `${req.user.name} added an internal note on: ${ticket.title}`,
    },
    req.user.id,
  );

  return sendResponse(
    res,
    201,
    true,
    comment,
    "Internal note added successfully",
  );
}, "Failed to add note");

// ==============================
// Update Ticket Status
// ==============================
const status = handle(async (req, res) => {
  const result = await updateTicketStatus(
    req.params.id,
    req.body.status,
    req.user,
  );

  if (result.changed) {
    await notifyUsers(await getClientRecipients(result), {
      ticketId: result.id,
      type: "status_changed",
      message: `Your ticket "${result.title}" is now ${result.status}`,
    });
  }

  return sendResponse(res, 200, true, result, "Status updated successfully");
}, "Failed to update status");

// ==============================
// Reopen Ticket
// ==============================
const reopen = handle(async (req, res) => {
  const result = await reopenTicket(req.params.id, req.user);

  const recipients =
    req.user.role === "client"
      ? [result.assigned_agent_id]
      : await getClientRecipients(result);

  await notifyUsers(
    recipients,
    {
      ticketId: result.id,
      type: "reopened",
      message: `Ticket reopened: ${result.title}`,
    },
    req.user.id,
  );

  return sendResponse(res, 200, true, result, "Ticket reopened successfully");
}, "Failed to reopen ticket");

// ==============================
// Assign, Reassign or Unassign Ticket
// ==============================
const assign = handle(async (req, res) => {
  const agentId = req.body.assigned_agent_id ?? null;

  const result = await assignTicket(req.params.id, agentId, req.user);

  if (result.changed && result.assigned_agent_id) {
    notify(ticketAssignedEmail(result));

    await notifyUsers([result.assigned_agent_id], {
      ticketId: result.id,
      type: "assigned",
      message: `You were assigned: ${result.ticketTitle}`,
    });
  }

  // The previous owner should know the ticket has left their queue
  if (result.changed && result.previousAgentId) {
    await notifyUsers([result.previousAgentId], {
      ticketId: null,
      type: "unassigned",
      message: `You are no longer assigned to: ${result.ticketTitle}`,
    });
  }

  return sendResponse(
    res,
    200,
    true,
    result,
    result.assigned_agent_id
      ? "Ticket assigned successfully"
      : "Ticket unassigned successfully",
  );
}, "Failed to assign ticket");

// ==============================
// Claim Ticket
// ==============================
const claim = handle(async (req, res) => {
  const result = await claimTicket(req.params.id, req.user);

  return sendResponse(res, 200, true, result, "Ticket claimed successfully");
}, "Failed to claim ticket");

// ==============================
// Soft Delete Ticket
// ==============================
const remove = handle(async (req, res) => {
  const result = await deleteTicket(req.params.id);

  return sendResponse(res, 200, true, result, "Ticket deleted successfully");
}, "Failed to delete ticket");

// ==============================
// Agent Dashboard
// ==============================
const agentDashboard = handle(async (req, res) => {
  const stats = await getAgentDashboardStats(req.user.id);

  return sendResponse(
    res,
    200,
    true,
    stats,
    "Agent dashboard retrieved successfully",
  );
}, "Failed to retrieve agent dashboard");

// ==============================
// Client Dashboard
// ==============================
const clientDashboard = handle(async (req, res) => {
  const stats = await getClientDashboardStats(req.user.client_id);

  return sendResponse(
    res,
    200,
    true,
    stats,
    "Client dashboard retrieved successfully",
  );
}, "Failed to retrieve client dashboard");

// ==============================
// Export Controllers
// ==============================
module.exports = {
  create,
  list,
  assignedTickets,
  unassignedTickets,
  detail,
  attachment,
  commentAttachment,
  reply,
  internalNote,
  status,
  reopen,
  assign,
  claim,
  remove,
  agentDashboard,
  clientDashboard,
};
