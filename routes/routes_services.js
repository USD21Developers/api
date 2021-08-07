const express = require("express");
const router = express.Router();

const churches = require("./controllers_services/churches");
router.get("/churches", churches.GET);

module.exports = router;