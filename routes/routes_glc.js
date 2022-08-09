const express = require("express");
const router = express.Router();
const utils = require("./controllers_glc/utils");
const authenticateToken = utils.authenticateToken;

// SUBSCRIBE

const subscribe = require("./controllers_glc/subscribe");
router.post("/subscribe", subscribe.POST);

// VERIFY ADMIN E-MAIL
const verify = require("./controllers_glc/verify");
router.post("/verify", verify.POST);

// CONFIRM ADMIN E-MAIL
const confirm = require("./controllers_glc/confirm");
router.post("/confirm", confirm.POST);

// SEND SMS
const sendsms = require("./controllers_glc/sendsms");
router.post("/sendsms", authenticateToken, sendsms.POST);

// SECURITY
const refreshToken = require("./controllers_glc/refresh-token");
router.post("/refresh-token", refreshToken.POST);

module.exports = router;
