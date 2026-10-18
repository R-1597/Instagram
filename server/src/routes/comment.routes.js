
const express = require("express");
const {
  createComment,
  getPostComments,
  deleteComment,
} = require("../controllers/comment.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/:postId/comments", authenticateToken, createComment);
router.get("/:postId/comments", authenticateToken, getPostComments);
router.delete(
  "/:postId/comments/:commentId",
  authenticateToken,
  deleteComment
);

module.exports = router;
