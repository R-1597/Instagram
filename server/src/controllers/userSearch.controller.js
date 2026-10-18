
const User = require("../models/User");

// Escape regex special characters so user input is treated as plain text.
const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const searchUsers = async (req, res, next) => {
  try {
    const query = req.query.q;

    if (typeof query !== "string" || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must contain at least 2 characters",
      });
    }

    const searchTerm = query.trim();
    const usernamePattern = new RegExp(escapeRegex(searchTerm), "i");

    const users = await User.find({
      username: usernamePattern,
      _id: { $ne: req.userId },
    })
      .select("_id username displayName profileImage bio")
      .sort({ username: 1 })
      .limit(10)
      .lean();

    return res.status(200).json({
      success: true,
      count: users.length,
      users: users.map((user) => ({
        id: user._id,
        username: user.username,
        displayName: user.displayName || "",
        profileImage: user.profileImage || null,
        bio: user.bio || "",
      })),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { searchUsers };
