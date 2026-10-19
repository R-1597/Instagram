
const notificationRoutes = require("./routes/notification.routes");
const commentRoutes = require("./routes/comment.routes");
const postRoutes = require("./routes/post.routes");
const followRoutes = require("./routes/follow.routes");
const helmet = require("helmet");
const userRoutes = require("./routes/user.routes");
const { authenticateToken } = require("./middleware/auth.middleware");
const authRoutes = require("./routes/auth.routes");
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");


const app = express();
// dotenv.config();
dotenv.config({ quiet: true });

app.use(helmet());

app.use(
  cors({
    // origin: process.env.CLIENT_URL || "http://localhost:5173", 
    origin: "http://localhost:5173",
     methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/users", followRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/posts", commentRoutes);
app.use("/api/notifications", notificationRoutes);


app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Instagram backend is running",
  });
});


app.get("/api/health/db", (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;

  res.status(isConnected ? 200 : 503).json({
    success: isConnected,
    database: isConnected ? "connected" : "disconnected",
  });
});


app.get("/api/auth/protected", authenticateToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authentication successful",
    userId: req.userId,
  });
});

module.exports = app;