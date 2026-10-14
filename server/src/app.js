

const userRoutes = require("./routes/user.routes");


const { authenticateToken } = require("./middleware/auth.middleware");

const authRoutes = require("./routes/auth.routes");

const mongoose = require("mongoose");

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
  })
);

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);



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