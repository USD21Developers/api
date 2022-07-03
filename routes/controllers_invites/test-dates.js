const moment = require("moment-timezone");

exports.GET = (req, res) => {
  const dates = {};
  dates.utcNow = moment().utc().format();
  dates.church = moment("2022-07-10 10:00 AM").format();
  dates.churchUtc = moment(dates.church).tz("utc").format();

  return res.status(200).send(dates);
};
