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

const countryOfCoordinates = require("./controllers_services/country-of-coordinates");
router.post("/country-of-coordinates", countryOfCoordinates.POST);

const sendgridEvent = require("./controllers_services/sendgrid-event");
router.post("/sendgrid-event", sendgridEvent.POST);

const scripture = require("./controllers_services/scripture");
router.post("/scripture", scripture.POST);

const googleSheetsTest = require("./controllers_services/google-sheets-test.js");
router.get("/google-sheets-test", googleSheetsTest.GET);

module.exports = router;
