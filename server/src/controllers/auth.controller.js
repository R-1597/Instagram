


const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const crypto = require("crypto");
const nodemailer = require("nodemailer");


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
      {
        tokenVersion: user.tokenVersion ?? 0,

      },
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

const result = await User.updateOne(
  { _id: user._id },
  {
    $set: { passwordHash: newPasswordHash },
    $inc: { tokenVersion: 1 },
  },
  { runValidators: true }
);

if (result.matchedCount !== 1 || result.modifiedCount !== 1) {
  return res.status(500).json({
    success: false,
    message: "Failed to update password",
  });
}
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


async function forgotPassword(req, res, next) {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // Use the same response whether the account exists or not.
    const genericResponse = {
      success: true,
      message:
        "If an account exists for that email, a password reset link will be sent.",
    };

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    if (
      !process.env.CLIENT_URL ||
      !process.env.SMTP_HOST ||
      !process.env.SMTP_USER ||
      !process.env.SMTP_PASS ||
      !process.env.SMTP_FROM
    ) {
      throw new Error("Password reset email is not configured.");
    }

    // Generate a strong random token. Store only its SHA-256 hash.
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.passwordResetTokenHash = resetTokenHash;
    user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const resetUrl = new URL(
      `/reset-password?token=${resetToken}`,
      process.env.CLIENT_URL
    ).toString();

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: user.email,
        subject: "Reset your InstaSpace password",
        text: [
          "We received a request to reset your InstaSpace password.",
          "",
          `Use this link within 15 minutes: ${resetUrl}`,
          "",
          "If you did not request this, you can ignore this email.",
        ].join("\n"),
      });
    } catch (emailError) {
      // Don't leave a valid token behind if email delivery fails.
      user.passwordResetTokenHash = undefined;
      user.passwordResetExpiresAt = undefined;
      await user.save();
      throw emailError;
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;

    if (
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/i.test(token) ||
      typeof newPassword !== "string" ||
      newPassword.length < 8 ||
      newPassword.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Provide a valid reset token and a password between 8 and 128 characters.",
      });
    }

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetTokenHash: resetTokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpiresAt");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "This reset link is invalid or has expired. Request a new one.",
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    user.passwordHash = passwordHash;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    next(error);
  }
}


module.exports = { register,login,changePassword,forgotPassword,resetPassword };
