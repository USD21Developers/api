const express = require("express");
const router = express.Router();

const geotagip = require("./controllers_services/geotagip");
router.get("/geotagip", geotagip.GET);

const churches = require("./controllers_services/churches");
router.get("/churches", churches.GET);

const churchDirectory = require("./controllers_services/church-directory");
router.get("/church-directory", churchDirectory.GET);

const countryNames = require("./controllers_services/country-names");
router.get("/country-names/:lang", countryNames.GET);

const church = require("./controllers_services/church");
router.get("/church/:churchid", church.GET);

module.exports = router;
