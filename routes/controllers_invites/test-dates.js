const moment = require("moment-timezone");

exports.GET = (req, res) => {
  const dates = {};

  dates.phx = moment.tz("2022-07-10 10:00 AM").local().format();
  dates.utc = moment.utc(dates.church).format("MMMM D, YYYY @ h:mm A");

  return res.status(200).send(dates);
};
