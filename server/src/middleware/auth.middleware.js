const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
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

    req.userId = payload.sub;
    next();
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