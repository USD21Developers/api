const moment = require("moment-timezone");

exports.GET = (req, res) => {
  const dates = {};
  const church = moment("2022-07-10 10:00 AM").format();

  dates.local = moment.tz(church, "America/Phoenix").format();
  dates.utc = moment.utc(dates.church).format("YYYY-MM-DD h:mm A");

  return res.status(200).send(dates);
};
