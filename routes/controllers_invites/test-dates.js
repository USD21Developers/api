const moment = require("moment-timezone");

exports.GET = (req, res) => {
  const dates = {};
  dates.church = moment.tz("2022-07-10 10:00 AM", "America/Phoenix").format();
  dates.churchUtc = moment.utc(dates.church).format("YYYY-MM-D H:mm A");

  return res.status(200).send(dates);
};
