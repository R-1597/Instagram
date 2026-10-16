const express = require("express");
const router = express.Router();

const authenticateToken =
  require("../middleware/auth.middleware").authenticateToken;

const {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
} = require("../controllers/follow.controller");

// Public profile relationship lists
router.get("/:userId/followers", getFollowers);
router.get("/:userId/following", getFollowing);

// Only the authenticated user can manage their own relationships
router.post("/:userId/follow", authenticateToken, followUser);
router.delete("/:userId/follow", authenticateToken, unfollowUser);

module.exports = router;