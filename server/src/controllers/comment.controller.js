
const mongoose = require("mongoose");
const Comment = require("../models/Comment");
const Post = require("../models/Post");
const Notification = require("../models/Notification");

const isValidId = (id) => mongoose.isValidObjectId(id);

async function createComment(req, res, next) {
  try {
    const { postId } = req.params;
    const userId = req.userId;
    const text = req.body?.text;

    if (!isValidId(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID.",
      });
    }

    if (typeof text !== "string" || !text.trim() || text.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Comment must contain 1–2000 characters.",
      });
    }

    const post = await Post.findById(postId).select("_id author");

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    const comment = await Comment.create({
      post: post._id,
      author: userId,
      text: text.trim(),
    });

    // Do not notify users when they comment on their own post.
    if (post.author.toString() !== userId) {
      try {
        await Notification.create({
          recipient: post.author,
          actor: userId,
          type: "comment",
          post: post._id,
          comment: comment._id,
        });
      } catch (notificationError) {
        // The comment has already been saved. Log notification failure
        // rather than incorrectly reporting that comment creation failed.
        console.error("Comment notification creation failed:", notificationError);
      }
    }

    const populatedComment = await Comment.findById(comment._id)
      .populate("author", "username displayName profileImage")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Comment added successfully.",
      comment: populatedComment,
    });
  } catch (error) {
    next(error);
  }
}

async function getPostComments(req, res, next) {
  try {
    const { postId } = req.params;

    if (!isValidId(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID.",
      });
    }

    const exists = await Post.exists({ _id: postId });

    if (!exists) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );

    const [comments, total] = await Promise.all([
      Comment.find({ post: postId })
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("author", "username displayName profileImage")
        .lean(),
      Comment.countDocuments({ post: postId }),
    ]);

    return res.status(200).json({
      success: true,
      comments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function deleteComment(req, res, next) {
  try {
    const { postId, commentId } = req.params;
    const userId = req.userId;

    if (!isValidId(postId) || !isValidId(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post or comment ID.",
      });
    }

    const post = await Post.findById(postId).select("_id author");

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    const comment = await Comment.findOne({
      _id: commentId,
      post: postId,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    const isCommentAuthor = comment.author.toString() === userId;
    const isPostAuthor = post.author.toString() === userId;

    if (!isCommentAuthor && !isPostAuthor) {
      return res.status(403).json({
        success: false,
        message: "You cannot delete this comment.",
      });
    }

    await Comment.deleteOne({ _id: comment._id });

    // Remove the associated notification if this comment generated one.
    await Notification.deleteMany({
      type: "comment",
      comment: comment._id,
    });

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createComment,
  getPostComments,
  deleteComment,
};
