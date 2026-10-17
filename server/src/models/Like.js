
const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// A user can like a particular post only once.
likeSchema.index({ post: 1, user: 1 }, { unique: true });

// Useful for retrieving likes belonging to a post.
likeSchema.index({ post: 1, createdAt: -1 });

module.exports = mongoose.model("Like", likeSchema);
