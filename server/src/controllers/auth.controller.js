
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { sendVerificationEmail } = require("../utils/email.service");



async function register(req, res, next) {
  let createdUser;

  try {
    const { username, email, password, displayName } = req.body;

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    const existingUser = await User.findOne({
      $or: [
        { username: normalizedUsername },
        { email: normalizedEmail },
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Username or email is already registered.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Email verification can be enabled later through .env.
    const verificationRequired =
      process.env.EMAIL_VERIFICATION_REQUIRED === "true";

    // Generate a token only when verification is enabled.
    const rawToken = verificationRequired
      ? crypto.randomBytes(32).toString("hex")
      : null;

    const tokenHash = rawToken
      ? crypto.createHash("sha256").update(rawToken).digest("hex")
      : null;

    createdUser = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
      displayName: displayName || "",

      // Restore normal registration while verification is disabled.
      isEmailVerified: !verificationRequired,

      emailVerificationTokenHash: tokenHash,
      emailVerificationExpires: rawToken
        ? new Date(Date.now() + 24 * 60 * 60 * 1000)
        : null,
    });

    // Send email only when mandatory verification is enabled.
    if (verificationRequired) {
      if (!process.env.API_BASE_URL) {
        throw new Error("API_BASE_URL is not configured");
      }

      const verificationUrl = new URL(
        "/api/auth/verify-email",
        process.env.API_BASE_URL
      );

      verificationUrl.searchParams.set("token", rawToken);

      await sendVerificationEmail({
        to: normalizedEmail,
        username: normalizedUsername,
        verificationUrl: verificationUrl.toString(),
      });
    }

    return res.status(201).json({
      success: true,
      message: verificationRequired
        ? "Registration received. Check your email and verify your account before logging in."
        : "Registration successful. You can now log in.",
      user: {
        id: createdUser._id,
        username: createdUser.username,
        email: createdUser.email,
        displayName: createdUser.displayName,
        isEmailVerified: !verificationRequired,
      },
    });
  } catch (error) {
    // Clean up a pending account if verification email delivery fails.
    if (createdUser?._id) {
      try {
        await User.deleteOne({
          _id: createdUser._id,
          isEmailVerified: false,
        });
      } catch (cleanupError) {
        console.error("Pending registration cleanup failed:", cleanupError);
      }
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Username or email is already registered.",
      });
    }

    if (error.message === "Unable to send verification email.") {
      return res.status(503).json({
        success: false,
        message:
          "We couldn't send the verification email. Please try registering again later.",
      });
    }

    next(error);
  }
}


async function verifyEmail(req, res, next) {
  try {
    const token = req.query.token;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is missing.",
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOneAndUpdate(
      {
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpires: { $gt: new Date() },
        isEmailVerified: false,
      },
      {
        $set: {
          isEmailVerified: true,
          emailVerificationTokenHash: null,
          emailVerificationExpires: null,
        },
      },
      { new: true }
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid or expired verification link. Request a new one if needed.",
      });
    }

    const loginUrl = new URL("/", process.env.CLIENT_URL);

    return res.status(200).json({
      success: true,
      message:
        "Email verified successfully! You can now log in to your account.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        isEmailVerified: true,
      },
      loginUrl: loginUrl.toString(),
    });
  } catch (error) {
    next(error);
  }
}


async function resendVerificationEmail(req, res, next) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({
      email: normalizedEmail,
    }).select("username isEmailVerified");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with that email address.",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message:
          "Your email is already verified. You can log in directly.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const result = await User.updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerificationTokenHash: tokenHash,
          emailVerificationExpires: new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ),
        },
      }
    );

    if (!result.matchedCount || !result.modifiedCount) {
      return res.status(500).json({
        success: false,
        message: "Failed to update verification token. Please try again.",
      });
    }

    const verificationUrl = new URL(
      "/api/auth/verify-email",
      process.env.API_BASE_URL
    );
    verificationUrl.searchParams.set("token", rawToken);

    await sendVerificationEmail({
      to: normalizedEmail,
      username: user.username,
      verificationUrl: verificationUrl.toString(),
    });

    return res.status(200).json({
      success: true,
      message:
        "Verification email resent. Check your inbox and verify your account.",
    });
  } catch (error) {
    if (error.message === "Unable to send verification email.") {
      return res.status(503).json({
        success: false,
        message:
          "We couldn't send the verification email. Please try again later.",
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

    // Normalize email consistently with registration.
    const normalizedEmail = email.trim().toLowerCase();

    // passwordHash uses select: false in the User model.
    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+passwordHash");

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

    // Enforce verification only when explicitly enabled.
    if (
      process.env.EMAIL_VERIFICATION_REQUIRED === "true" &&
      !user.isEmailVerified
    ) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email before logging in.",
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


module.exports = { register, login, changePassword, forgotPassword, resetPassword };
