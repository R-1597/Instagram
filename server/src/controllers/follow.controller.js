const mongoose = require("mongoose");
const Follow = require("../models/Follow");
const User = require("../models/User");
const Notification = require("../models/Notification");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

async function followUser(req, res, next) {
  try {
    const followerId = req.userId;
    const followingId = req.params.userId;

    if (!isValidId(followingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    if (followerId === followingId) {
      return res.status(400).json({
        success: false,
        message: "You cannot follow yourself.",
      });
    }

    const targetUser = await User.findById(followingId).select("_id");

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    try {
      const follow = await Follow.create({
        follower: followerId,
        following: followingId,
      });
     // NEW: Create a notification for the followed user.
try {
  await Notification.create({
    recipient: followingId,
    actor: followerId,
    type: "follow",
  });
} catch (notificationError) {
  console.error(
    "Follow notification creation failed:",
    notificationError
  );
}

      return res.status(201).json({
        success: true,
        message: "User followed successfully.",
        follow: {
          id: follow._id,
          follower: follow.follower,
          following: follow.following,
        },
      });
    } catch (error) {
      // Duplicate relationship: the unique index rejects it.
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "You already follow this user.",
        });
      }

      throw error;
    }
  } catch (error) {
    next(error);
  }
}

async function unfollowUser(req, res, next) {
  try {
    const followerId = req.userId;
    const followingId = req.params.userId;

    if (!isValidId(followingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    if (followerId === followingId) {
      return res.status(400).json({
        success: false,
        message: "You cannot unfollow yourself.",
      });
    }

    const result = await Follow.deleteOne({
      follower: followerId,
      following: followingId,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Follow relationship not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User unfollowed successfully.",
    });
  } catch (error) {
    next(error);
  }
}

async function getFollowers(req, res, next) {
  try {
    const userId = req.params.userId;

    if (!isValidId(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const userExists = await User.exists({ _id: userId });

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const follows = await Follow.find({ following: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("follower", "username displayName profileImage")
      .lean();

    return res.status(200).json({
      success: true,
      count: follows.length,
      users: follows.map((item) => item.follower),
    });
  } catch (error) {
    next(error);
  }
}

async function getFollowing(req, res, next) {
  try {
    const userId = req.params.userId;

    if (!isValidId(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    const userExists = await User.exists({ _id: userId });

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const follows = await Follow.find({ follower: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("following", "username displayName profileImage")
      .lean();

    return res.status(200).json({
      success: true,
      count: follows.length,
      users: follows.map((item) => item.following),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
};