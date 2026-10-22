const User = require("../models/User");
const mongoose = require("mongoose");


const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user profile",
    });
  }
};

const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
        }

        const user = await User.findById(userId).select(
            "username displayName bio profileImage createdAt"
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                displayName: user.displayName,
                bio: user.bio,
                profileImage: user.profileImage,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve user profile",
        });
    }
};

const updateCurrentUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: req.validatedBody },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
};


module.exports = { getCurrentUser,updateCurrentUser,getUserProfile };