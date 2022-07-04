const moment = require("moment-timezone");

exports.GET = (req, res) => {
  const dates = {};
  const timezone = "America/Phoenix";

  dates.phx = moment("2022-07-10 10:00 AM").tz("America/Phoenix").local().format();
  dates.utc = moment.tz(dates.phx, "utc").format();

  return res.status(200).send(dates);
};
