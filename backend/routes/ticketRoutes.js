const express = require("express");
const router = express.Router();
const upload = require("../middlewares/upload");

const {
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
} = require("../controllers/ticketController");

const { authenticate, authorize } = require("../middlewares/auth");

const {
  ticketValidation,
  commentValidation,
  assignValidation,
  statusValidation,
} = require("../validations/auth");

const { validateRequest } = require("../middlewares/validate");

// =============================
// Create Ticket
// =============================
router.post(
  "/",
  authenticate,
  authorize("client"),
  upload.single("attachment"),
  ticketValidation,
  validateRequest,
  create,
);
// =============================
// Get All Tickets
// =============================
router.get("/", authenticate, authorize("client", "agent", "admin"), list);

// =============================
// Agent Dashboard
// =============================
router.get("/dashboard", authenticate, authorize("agent"), agentDashboard);
// =============================
// Client Dashboard
// =============================
router.get(
  "/client-dashboard",
  authenticate,
  authorize("client"),
  clientDashboard,
);

// =============================
// Assigned Tickets
// =============================
router.get("/assigned", authenticate, authorize("agent"), assignedTickets);

// =============================
// Unassigned Tickets
// =============================
router.get("/unassigned", authenticate, authorize("agent"), unassignedTickets);

// =============================
// Get Ticket Details
// =============================
router.get("/:id", authenticate, authorize("client", "agent", "admin"), detail);

// =============================
// Download Attachments
// =============================
router.get(
  "/:id/attachment",
  authenticate,
  authorize("client", "agent", "admin"),
  attachment,
);

router.get(
  "/:id/comments/:commentId/attachment",
  authenticate,
  authorize("client", "agent", "admin"),
  commentAttachment,
);

// =============================
// Reply to Ticket
// =============================
router.post(
  "/:id/reply",
  authenticate,
  authorize("client", "agent", "admin"),
  upload.single("attachment"),
  commentValidation,
  validateRequest,
  reply,
);

// =============================
// Internal Note
// =============================
router.post(
  "/:id/internal-note",
  authenticate,
  authorize("agent", "admin"),
  upload.single("attachment"),
  commentValidation,
  validateRequest,
  internalNote,
);

// =============================
// Update Ticket Status
// =============================
router.patch(
  "/:id/status",
  authenticate,
  authorize("agent", "admin"),
  statusValidation,
  validateRequest,
  status,
);

// =============================
// Assign Ticket
// =============================
router.patch(
  "/:id/assign",
  authenticate,
  authorize("admin"),
  assignValidation,
  validateRequest,
  assign,
);

// =============================
// Soft Delete Ticket
// =============================
router.delete("/:id", authenticate, authorize("admin"), remove);

module.exports = router;
