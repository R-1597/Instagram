
const express = require("express");
const {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notification.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticateToken);

router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:notificationId/read", markNotificationRead);
router.get("/", getNotifications);

module.exports = router;
