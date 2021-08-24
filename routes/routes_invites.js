const express = require("express");
const router = express.Router();
const utils = require("./controllers_invites/utils");
const authenticateToken = utils.authenticateToken;


// REGISTRATION

const register = require("./controllers_invites/register");
router.post("/register", register.POST);

const registerConfirm = require("./controllers_invites/register-confirm");
router.post("/register-confirm", registerConfirm.POST);


// AUTHORIZATION

const authorize = require("./controllers_invites/authorize");
router.post("/authorize", authorize.POST);

module.exports = router;