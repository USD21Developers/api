const moment = require("moment");
const momentTimeZone = require("moment-timezone");

exports.GET = (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["sysadmin", "user"];
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
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Test response
  /* const eventsTest = [{ eventid: 1 }, { eventid: 2 }, { eventid: 3 }];
  return res.status(200).send({
    msg: "events synced", msgType: "success", events: eventsTest
  }); */

  const sql = `
    SELECT
      eventid,
      frequency,
      multidayBeginDate,
      multidayEndDate,
      startdate,
      timezone,
      title
    FROM
      events
    WHERE
      createdBy = ?
    AND
      isDeleted = 0
    ORDER BY
      eventid ASC
    ;
  `;

  db.query(sql, [req.user.userid], (error, result) => {
    if (error) {
      console.log(error);
      return res
        .status(500)
        .send({ msg: "unable to query for events", msgType: "error", error: error });
    }
    if (!result.length) {
      return res.status(200).send({ msg: "no events found", msgType: "success", events: [] });
    }

    return res.status(200).send({ msg: "events retrieved", msgType: "success", events: result });
  });
};
