const express = require("express");
const router = express.Router();
const utils = require("./controllers_invites/utils");
const authenticateToken = utils.authenticateToken;

// REGISTRATION

const register = require("./controllers_invites/register");
router.post("/register", register.POST);

const registerConfirm = require("./controllers_invites/register-confirm");
router.post("/register-confirm", registerConfirm.POST);

// SECURITY

const refreshToken = require("./controllers_invites/refresh-token");
router.post("/refresh-token", refreshToken.POST);

const login = require("./controllers_invites/login");
router.post("/login", login.POST);

const forgotPassword = require("./controllers_invites/forgot-password");
router.post("/forgot-password", forgotPassword.POST);

const resetPassword = require("./controllers_invites/reset-password");
router.post("/reset-password", resetPassword.POST);

/* const passwordMustChange = require("./controllers_invites/password-must-change");
router.post(
  "/password-must-change",
  authenticateToken,
  passwordMustChange.POST
); */

// EVENTS

const eventAdd = require("./controllers_invites/event-add");
router.post("/event-add", authenticateToken, eventAdd.POST);

// AUTHORIZATION

const authorize = require("./controllers_invites/authorize");
router.post("/authorize", authorize.POST);

// SYNC

const syncEvents = require("./controllers_invites/sync-events");
router.get("/sync-events", authenticateToken, syncEvents.GET);

module.exports = router;
