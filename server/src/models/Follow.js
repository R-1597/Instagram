const mongoose = require("mongoose");

const followSchema = new mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    following: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// A user can follow a particular account only once.
followSchema.index(
  { follower: 1, following: 1 },
  { unique: true }
);

// A user cannot follow themselves.
followSchema.pre("validate", function () {
  if (
    this.follower &&
    this.following &&
    this.follower.equals(this.following)
  ) {
    this.invalidate("following", "You cannot follow yourself.");
  }
});

module.exports = mongoose.model("Follow", followSchema);