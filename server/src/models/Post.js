const mongoose = require("mongoose");

const mediaSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
    },
    width: {
      type: Number,
      min: 1,
    },
    height: {
      type: Number,
      min: 1,
    },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    caption: {
      type: String,
      trim: true,
      maxlength: 2200,
      default: "",
    },
    media: {
      type: [mediaSchema],
      default: [],
    },
  },
  { timestamps: true }
);

postSchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);