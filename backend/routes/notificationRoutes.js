const express = require("express");
const router = express.Router();

const { list, read, readAll } = require("../controllers/notificationController");
const { authenticate } = require("../middlewares/auth");
const { requireNumericId } = require("../middlewares/validate");

router.param("id", requireNumericId);

// Every route here is scoped to the signed-in user's own notifications
router.get("/", authenticate, list);
router.patch("/read-all", authenticate, readAll);
router.patch("/:id/read", authenticate, read);

module.exports = router;
