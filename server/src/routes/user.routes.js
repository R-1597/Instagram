const express = require("express");
const { getCurrentUser , updateCurrentUser,} = require("../controllers/user.controller");
const { authenticateToken } = require("../middleware/auth.middleware");

const {validateProfileUpdate,} = require("../middleware/validate");





const router = express.Router();

router.get("/me", authenticateToken, getCurrentUser);


router.patch(
    "/me",
    authenticateToken,
    validateProfileUpdate,
    updateCurrentUser
);



module.exports = router;