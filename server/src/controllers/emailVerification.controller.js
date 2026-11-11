
const crypto = require("crypto");
const User = require("../models/User");

async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;

    if (
      typeof token !== "string" ||
      !/^[a-f0-9]{64}$/i.test(token)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification link.",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpires: { $gt: new Date() },
      isEmailVerified: false,
    }).select("+emailVerificationTokenHash +emailVerificationExpires");

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "This verification link is invalid, expired, or already used.",
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpires = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Email verified successfully. You can now log in to InstaSpace.",
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { verifyEmail };
