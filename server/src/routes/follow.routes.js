
const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth.middleware");

const {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowCounts,
  getFollowStatus,
} = require("../controllers/follow.controller");

// Profile relationship information
router.get("/:userId/counts", getFollowCounts);
router.get("/:userId/status", authenticateToken, getFollowStatus);

// Relationship lists
router.get("/:userId/followers", getFollowers);
router.get("/:userId/following", getFollowing);

// Follow and unfollow
router.post("/:userId/follow", authenticateToken, followUser);
router.delete("/:userId/follow", authenticateToken, unfollowUser);

module.exports = router;
