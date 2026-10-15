


const jwt = require("jsonwebtoken");



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

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    // passwordHash uses select: false in the User model.
    // Explicitly request it for password verification.
    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const accessToken = jwt.sign(
      {},
      process.env.JWT_SECRET,
      {
        algorithm: "HS256",
        subject: user._id.toString(),
        expiresIn: process.env.JWT_EXPIRES_IN || "15m",
        issuer: "instagram-clone-api",
        audience: "instagram-clone-client",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      tokenType: "Bearer",
      expiresIn: process.env.JWT_EXPIRES_IN || "15m",
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
    next(error);
  }
}



const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.validatedBody;

    const user = await User.findById(req.userId)
      .select("+passwordHash");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const matches = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!matches) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // user.passwordHash = await bcrypt.hash(newPassword, 12);
    // await user.save();
const newPasswordHash = await bcrypt.hash(newPassword, 12);

await User.updateOne(
  { _id: user._id },
  { $set: { passwordHash: newPasswordHash } },
  { runValidators: true }
);
    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please log in again after your session expires.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};



module.exports = { register,login,changePassword, };
