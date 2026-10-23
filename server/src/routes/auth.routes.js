
const express = require("express");
const { register,login,changePassword , forgotPassword,resetPassword, } = require("../controllers/auth.controller");
const { validateRegister ,validateLogin,validateChangePassword,} = require("../middleware/validate");
const { authenticateToken } = require("../middleware/auth.middleware");

const { loginLimiter, registerLimiter,passwordResetLimiter } = require("../middleware/rateLimit.middleware");


const router = express.Router();

router.post("/register", registerLimiter, validateRegister, register);
router.post("/login", loginLimiter, validateLogin, login);
router.post(
  "/forgot-password",
  passwordResetLimiter,
  forgotPassword
);

router.post(
  "/reset-password",
  passwordResetLimiter,
  resetPassword
);

router.patch("/change-password", authenticateToken, validateChangePassword, changePassword);
module.exports = router;
