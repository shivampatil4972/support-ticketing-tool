const { sendResponse, handle } = require("../utils/response");

const {
  getNotifications,
  markRead,
  markAllRead,
} = require("../services/notificationService");

const list = handle(async (req, res) => {
  const result = await getNotifications(req.user.id);

  return sendResponse(
    res,
    200,
    true,
    result,
    "Notifications retrieved successfully",
  );
}, "Failed to retrieve notifications");

const read = handle(async (req, res) => {
  const result = await markRead(req.params.id, req.user.id);

  return sendResponse(res, 200, true, result, "Notification marked as read");
}, "Failed to update notification");

const readAll = handle(async (req, res) => {
  await markAllRead(req.user.id);

  return sendResponse(res, 200, true, null, "Notifications marked as read");
}, "Failed to update notifications");

module.exports = { list, read, readAll };
