const express = require("express");
const router = express.Router();
const utils = require("./controllers_fp/utils");
const authenticateToken = utils.authenticateToken;

// REGISTRATION

const register = require("./controllers_fp/register");
router.post("/register", register.POST);

const registerConfirm = require("./controllers_fp/register-confirm");
router.post("/register-confirm", registerConfirm.POST);

// SECURITY

const refreshToken = require("./controllers_fp/refresh-token");
router.post("/refresh-token", refreshToken.POST);

const login = require("./controllers_fp/login");
router.post("/login", login.POST);

const forgotPassword = require("./controllers_fp/forgot-password");
router.post("/forgot-password", forgotPassword.POST);

const resetPassword = require("./controllers_fp/reset-password");
router.post("/reset-password", resetPassword.POST);

const passwordMustChange = require("./controllers_fp/password-must-change");
router.post(
  "/password-must-change",
  authenticateToken,
  passwordMustChange.POST
);

module.exports = router;
