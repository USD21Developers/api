const moment = require("moment");

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

  // Get request params
  let userid = req.params["userid"] || "";

  // Validate:  userid must exist
  if (userid === "") {
    return res
      .status(400)
      .send({ msg: "userid is required", msgType: "error" });
  }

  // Validate:  userid must be numeric
  userid = parseInt(userid);
  if (typeof userid !== "number") {
    return res
      .status(400)
      .send({ msg: "userid must be numeric", msgType: "error" });
  }

  // Ensure that userid is a positive integer
  userid = Math.abs(parseInt(userid));

  const sql = `
    SELECT
      eventid,
      churchid,
      type,
      title,
      frequency,
      duration,
      durationInHours,
      timezone,
      startdate,
      multidaybegindate,
      multidayenddate,
      locationvisibility,
      locationaddressline1,
      locationaddressline2,
      locationaddressline3,
      locationcoordinates,
      locationname,
      otherlocationdetails,
      hasvirtual,
      sharewithfollowers,
      country,
      lang,
      createdBy
    FROM
      events
    WHERE
      createdBy = ?
    AND
      (
        createdBy = ?
        OR
        sharewithfollowers = "yes"
      )
    ORDER BY
      type, title
    ;
  `;

  db.query(sql, [userid, req.user.userid], (error, results) => {
    if (error) {
      console.log(error);
      return res
        .status(500)
        .send({ msg: "unable to query for event list", msgType: "error" });
    }

    const events = results.map((item) => {
      if (item.locationvisibility === "discreet") {
        item.locationname = null;
        item.locationaddressline1 = null;
        item.locationaddressline2 = null;
        item.locationaddressline3 = null;
        item.locationcoordinates = null;
        item.otherlocationdetails = null;
        return item;
      }

      return item;
    });

    const unexpiredEvents = events.filter((event) => {
      const { duration } = event;
      const isMultiDay = duration === "multiple days" ? true : false;
      const nowDateTimeMoment = moment();

      if (!isMultiDay) {
        const { durationInHours } = event;
        const endDateTimeMoment = moment(event.startdate).add(
          durationInHours,
          "hours"
        );
        if (nowDateTimeMoment.isBefore(endDateTimeMoment)) {
          return true;
        }
        return false;
      } else if (isMultiDay) {
        const endDateTimeMoment = moment(event.multidayenddate);
        if (nowDateTimeMoment.isBefore(endDateTimeMoment)) {
          return true;
        }
        return false;
      }

      return true;
    });

    return res.status(200).send({
      msg: "event list retrieved",
      msgType: "success",
      events: unexpiredEvents,
    });
  });
};
