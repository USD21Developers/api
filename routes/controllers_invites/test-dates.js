const moment = require("moment-timezone");

exports.GET = (req, res) => {
  const timezone = "America/Phoenix";
  const localDateTime = moment.tz("2022-07-10 10:00 AM", timezone);
  const utcDateTime = moment.tz(localDateTime, "utc");

  return res.status(200).send([localDateTime.format(), utcDateTime.format()]);
};
