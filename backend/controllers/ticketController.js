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
  assignTicket,
  deleteTicket,
  getAssignedTickets,
  getUnassignedTickets,
  getAgentDashboardStats,
  getClientDashboardStats,
} = require("../services/ticketService");

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
    attachmentPath: req.file ? req.file.filename : null,
  });

  notify(ticketCreatedEmail(req.user.email, ticket));

  return sendResponse(res, 201, true, ticket, "Ticket created successfully");
}, "Failed to create ticket");

// ==============================
// Get All Tickets
// ==============================
const list = handle(async (req, res) => {
  const result = await getTicketsForUser(
    req.user,
    req.query.page,
    req.query.limit,
    req.query.search || "",
  );

  return sendResponse(res, 200, true, result, "Tickets retrieved successfully");
}, "Failed to retrieve tickets");

// ==============================
// Assigned Tickets
// ==============================
const assignedTickets = handle(async (req, res) => {
  const result = await getAssignedTickets(
    req.user,
    req.query.page,
    req.query.limit,
    req.query.search || "",
  );

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
  const result = await getUnassignedTickets(
    req.query.page,
    req.query.limit,
    req.query.search || "",
  );

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

  return sendResponse(
    res,
    200,
    true,
    {
      ticket,
      comments,
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
  await getTicketById(req.params.id, req.user);

  const comment = await addComment({
    ticketId: req.params.id,
    userId: req.user.id,
    message: req.body.message.trim(),
    isInternal: false,
    attachmentPath: req.file ? req.file.filename : null,
  });

  if (req.user.role === "client" && comment.agentEmail) {
    notify(clientReplyEmail(comment));
  } else if (req.user.role === "agent" && comment.clientEmail) {
    notify(agentReplyEmail(comment));
  }

  return sendResponse(res, 201, true, comment, "Reply added successfully");
}, "Failed to add reply");

// ==============================
// Internal Note
// ==============================
const internalNote = handle(async (req, res) => {
  // Throws unless the user may view this ticket
  await getTicketById(req.params.id, req.user);

  const comment = await addComment({
    ticketId: req.params.id,
    userId: req.user.id,
    message: req.body.message.trim(),
    isInternal: true,
    attachmentPath: req.file ? req.file.filename : null,
  });

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

  return sendResponse(res, 200, true, result, "Status updated successfully");
}, "Failed to update status");

// ==============================
// Assign Ticket
// ==============================
const assign = handle(async (req, res) => {
  const result = await assignTicket(
    req.params.id,
    req.body.assigned_agent_id,
  );

  notify(ticketAssignedEmail(result));

  return sendResponse(res, 200, true, result, "Ticket assigned successfully");
}, "Failed to assign ticket");

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
  assign,
  remove,
  agentDashboard,
  clientDashboard,
};
