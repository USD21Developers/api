const moment = require("moment-timezone");

exports.GET = (req, res) => {
  const timezone = "America/Phoenix";
  const localDateTime = moment("2022-07-10 10:00 AM").tz(timezone);
  const utcDateTime = moment.utc(localDateTime).format("h:mm A");

  return res.status(200).send(["10:00 AM", utcDateTime]);
};
