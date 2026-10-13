
const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function register(req, res, next) {
  try {
    const { username, email, password, displayName } = req.body;

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Username or email is already registered",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      username,
      email,
      passwordHash,
      displayName: displayName || "",
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        profileImage: user.profileImage,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    // A concurrent registration may pass the initial lookup.
    // The unique MongoDB index remains the final safeguard.
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Username or email is already registered",
      });
    }

    next(error);
  }
}

module.exports = { register };
