const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Adjust path/capitalization to your actual model


async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const [scheme, token, ...extra] = (authHeader || "").split(" ");

  if (
    scheme !== "Bearer" ||
    !token ||
    extra.length > 0 ||
    !process.env.JWT_SECRET
  ) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "instagram-clone-api",
      audience: "instagram-clone-client",
    });

    if (typeof payload !== "object" || !payload.sub) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    
    const user = await User.findById(payload.sub)
      .select("tokenVersion");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if ((payload.tokenVersion ?? 0) !== user.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: "Token is no longer valid",
      });
    }

    req.userId = user._id.toString();
    next();


    // req.userId = payload.sub;
    // next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    next(error);
  }
}

module.exports = { authenticateToken };