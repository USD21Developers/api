const moment = require("moment-timezone");

exports.GET = (req, res) => {
  const passedDateTime = "2022-07-10 10:00";
  const passedTimezone = "America/Phoenix";
  const utc = moment.tz(passedDateTime, passedTimezone).utc();
  const formatted = utc.format("YYYY-MM-DD HH:mm");

  return res.status(200).send({ utc: formatted });
};