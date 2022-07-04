const moment = require("moment-timezone");

exports.GET = (req, res) => {
  const passedDateTime = "2022-07-10 10:00 AM";
  const passedTimezone = "America/Phoenix";
  const local = moment.tz(passedDateTime, passedTimezone);
  const utc = moment.tz(local, "utc");

  return res.status(200).send({ utc: utc.format("YYYY-MM-DD HH:mm") });
};