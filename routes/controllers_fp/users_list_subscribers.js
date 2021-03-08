const moment = require("moment-timezone");

exports.POST = (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["sysadmin"];
  let isAuthorized = false;
  if (allowedUsertypes.includes(usertype)) isAuthorized = true;
  if (req.user.may_create_coupons) isAuthorized = true;
  if (!isAuthorized) {
    console.log(`User (userid ${req.user.userid}) is not authorized.`);
    return res.status(401).send({
      msg: "user is not authorized for this action",
      msgType: "error",
    });
  }

  // Set database
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-test")
    : require("../../database");

  const timezone = req.body.timezone || "UTC";
  const timeZoneOffset = moment.tz(timezone).format("Z:00").slice(0, -3);

  // Query
  const sql = `
    SELECT
      userid,
      fullname,
      usertype,
      userstatus,
      date_format(convert_tz(subscribeduntil, '+00:00', ?), "%M %e, %Y") AS expiry
    FROM
      users
    WHERE
      subscribeduntil IS NOT NULL
    ORDER BY
      subscribeduntil DESC,
      lastname ASC
    ;
  `;
  db.query(sql, [timeZoneOffset], (err, result) => {
    if (err) {
      console.log(err);
      return res
        .status(500)
        .send({ msg: "unable to get subscribers", msgType: "error" });
    }

    return res
      .status(200)
      .send({ msg: "subscribers retrieved", msgType: "success", data: result });
  });
};
