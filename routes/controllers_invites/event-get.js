exports.POST = (req, res) => {
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
  let eventid = req.body.eventid || "";

  // Validate:  eventid must exist
  if (eventid === "") {
    return res.status(400).send({ msg: "eventid is required", msgType: "error" });
  }

  // Validate:  eventid must be numeric
  if (typeof eventid !== "number") {
    return res.status(400).send({ msg: "eventid must be numeric", msgType: "error" });
  }

  // Ensure that eventid is a positive integer
  eventid = Math.abs(parseInt(eventid));

  const sql = `
    SELECT
      eventid,
      type,
      title,
      description,
      frequency,
      duration,
      durationInHours,
      timezone,
      startdate,
      multidaybegindate,
      multidayenddate,
      country,
      lang
    FROM
      events
    WHERE
      eventid = ?
    AND
      isDeleted = 0
    LIMIT
      1
    ;
  `;

  db.query(sql, [eventid], (error, result) => {
    if (error) {
      console.log(error);
      return res
        .status(500)
        .send({ msg: "unable to query for event", msgType: "error", error: error });
    }

    if (!result.length) {
      return res.status(404).send({ msg: "event not found", msgType: "error" });
    }

    return res.status(200).send({ msg: "event retrieved", msgType: "success", event: result[0] })
  });
};
