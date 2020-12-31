const moment = require("moment-timezone");

exports.POST = (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["user"];
  if (!allowedUsertypes.includes(usertype)) {
    console.log(`User (userid ${req.user.userid}) is not authorized.`);
    return res.status(401).send({
      msg: "user is not authorized for this action",
      msgType: "error",
    });
  }
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-test")
    : require("../../database");

  const timeZone = req.body.timeZone;
  const timeZoneOffset = moment.tz(timeZone).format("Z:00").slice(0, -3);

  console.log("Beginning subscription...");
  return res
    .status(200)
    .send({ msg: "Beginning subscription...", msgType: "success" });
};
