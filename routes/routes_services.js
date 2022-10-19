const express = require("express");
const router = express.Router();

const churches = require("./controllers_services/churches");
router.get("/churches", churches.GET);

const geotagip = require("./controllers_services/geotagip");
router.get("/geotagip", geotagip.GET);

module.exports = router;
