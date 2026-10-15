
const express = require("express");
const { register,login,changePassword , } = require("../controllers/auth.controller");
const { validateRegister ,validateLogin,validateChangePassword,} = require("../middleware/validate");
const { authenticateToken } = require("../middleware/auth.middleware");

const { authLimiter } = require("../middleware/rateLimit.middleware");


const router = express.Router();

router.post("/register", authLimiter,validateRegister, register);
router.post("/login", authLimiter,validateLogin, login);
router.patch("/change-password", authenticateToken, validateChangePassword, changePassword);
module.exports = router;
