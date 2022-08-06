const express = require("express");
const router = express.Router();
const utils = require("./controllers_glc/utils");

// SUBSCRIBE

const subscribe = require("./controllers_glc/subscribe");
router.post("/subscribe", subscribe.POST);

// VERIFY ADMIN E-MAIL
const verify = require("./controllers_glc/verify");
router.post("/verify", verify.POST);

// CONFIRM ADMIN E-MAIL
const confirm = require("./controllers_glc/confirm");
router.post("/confirm", confirm.POST);

module.exports = router;
