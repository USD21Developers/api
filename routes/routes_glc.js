const express = require("express");
const router = express.Router();
const utils = require("./controllers_glc/utils");

// SUBSCRIBE

const subscribe = require("./controllers_glc/subscribe");
router.post("/subscribe", subscribe.POST);

module.exports = router;
