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

  const sql = `
    SELECT
      date_format(convert_tz(subscribeduntil, '+00:00', ?), "%Y-%m-%d") AS expiry,
      DATEDIFF(subscribeduntil, UTC_TIMESTAMP()) AS daysRemaining
    FROM
      users
    WHERE
      userid = ?
    AND
      subscribeduntil IS NOT NULL
    AND
      subscribeduntil > UTC_TIMESTAMP()
    ;
  `;
  db.query(sql, [timeZoneOffset, req.user.userid], (err, result) => {
    if (err) {
      console.log(err);
      return res
        .status(500)
        .send({ msg: "unable to query for subscription", msgType: "error" });
    }

    if (!result.length) {
      return res
        .status(404)
        .send({ msg: "user is not subscribed", msgType: "error" });
    }

    const { daysRemaining, expiry } = result[0];

    res.status(200).send({
      msg: "user is subscribed",
      msgType: "success",
      daysRemaining: daysRemaining,
      expiry: expiry,
    });
  });
};
