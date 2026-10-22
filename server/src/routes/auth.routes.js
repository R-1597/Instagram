
const express = require("express");
const { register,login,changePassword , } = require("../controllers/auth.controller");
const { validateRegister ,validateLogin,validateChangePassword,} = require("../middleware/validate");
const { authenticateToken } = require("../middleware/auth.middleware");

const { loginLimiter, registerLimiter } = require("../middleware/rateLimit.middleware");


const router = express.Router();

router.post("/register", registerLimiter,validateRegister, register);
router.post("/login", loginLimiter,validateLogin, login);
router.patch("/change-password", authenticateToken, validateChangePassword, changePassword);
module.exports = router;
