const express = require("express");
const { authenticateToken } = require("../middleware/auth.middleware");

const {
  startConversation,
  getConversations,
  getMessages,
  sendMessage,
  getUnreadMessageCount,
  markConversationRead,
} = require("../controllers/message.controller");

const router = express.Router();

// All messaging endpoints require login.
router.use(authenticateToken);

router.post("/conversations", startConversation);
router.get("/conversations", getConversations);
router.get("/conversations/:conversationId/messages", getMessages);
router.post("/conversations/:conversationId/messages", sendMessage);
router.get("/unread-count", getUnreadMessageCount);

router.patch(
  "/conversations/:conversationId/read",
  markConversationRead
);
module.exports = router;