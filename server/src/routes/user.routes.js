const express = require("express");
const { getCurrentUser , updateCurrentUser,} = require("../controllers/user.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

const {validateProfileUpdate,} = require("../middleware/validate");
const { getUserPosts } = require("../controllers/post.controller");
const { searchUsers } = require("../controllers/userSearch.controller");



const router = express.Router();

router.get("/me", authenticateToken, getCurrentUser);
router.get("/search", authenticateToken, searchUsers);

router.patch(
    "/me",
    authenticateToken,
    validateProfileUpdate,
    updateCurrentUser
);

router.get("/:userId/posts", getUserPosts);

module.exports = router;