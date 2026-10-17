const express = require("express");
const { createPost,getPostById,deletePost,uploadImage,getHomeFeed, updatePost, getUserPosts ,likePost,unlikePost,} = require("../controllers/post.controller");
const { authenticateToken } = require("../middleware/auth.middleware");
const { validateCreatePost } = require("../middleware/validate");
const upload = require("../middleware/upload.middleware");

const router = express.Router();

router.post(
  "/",
  authenticateToken,
  validateCreatePost,
  createPost
);
router.get("/feed", authenticateToken, getHomeFeed);
router.get("/user/:userId", authenticateToken, getUserPosts);
router.post(
  "/uploads/image",
  authenticateToken,
  upload.single("image"),
  uploadImage
);
router.post(
  "/:postId/like",
  authenticateToken,
  likePost
);
router.delete(
  "/:postId/like",
  authenticateToken,
  unlikePost
);
router.patch("/:postId", authenticateToken, updatePost);
router.get("/:postId", authenticateToken,getPostById);

router.delete("/:postId", authenticateToken, deletePost);




module.exports = router;