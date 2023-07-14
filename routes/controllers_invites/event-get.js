exports.POST = (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["sysadmin", "user"];
  let isAuthorized = false;
  if (allowedUsertypes.includes(usertype)) isAuthorized = true;
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
    return res
      .status(400)
      .send({ msg: "eventid is required", msgType: "error" });
  }

  // Validate:  eventid must be numeric
  if (typeof eventid !== "number") {
    return res
      .status(400)
      .send({ msg: "eventid must be numeric", msgType: "error" });
  }

  // Ensure that eventid is a positive integer
  eventid = Math.abs(parseInt(eventid));

  const sql = `
    SELECT
      eventid,
      churchid,
      type,
      title,
      description,
      frequency,
      duration,
      durationInHours,
      timezone,

      CONCAT(
        DATE_FORMAT(startdate, '%Y-%m-%d'),
            'T',
            TIME_FORMAT(startdate, '%T'),
            'Z'
      ) AS startdate,

      CONCAT(
        DATE_FORMAT(multidaybegindate, '%Y-%m-%d'),
            'T',
            TIME_FORMAT(multidaybegindate, '%T'),
            'Z'
      ) AS multidaybegindate,

      CONCAT(
        DATE_FORMAT(multidayenddate, '%Y-%m-%d'),
            'T',
            TIME_FORMAT(multidayenddate, '%T'),
            'Z'
      ) AS multidayenddate,
      
      locationvisibility,
      locationname,
      locationaddressline1,
      locationaddressline2,
      locationaddressline3,
      locationcoordinates,
      otherlocationdetails,
      virtualconnectiondetails,
      sharewithfollowers,
      hasvirtual,
      contactfirstname,
      contactlastname,
      contactemail,
      contactphone,
      contactphonecountrydata,
      country,
      lang,
      createdBy
    FROM
      events
    WHERE
      eventid = ?
    AND
      isDeleted = 0
    AND
      (
        createdBy = ?
        OR
        sharewithfollowers = "yes"
      )
    ;
  `;

  db.query(sql, [eventid, req.user.userid], (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).send({
        msg: "unable to query for event",
        msgType: "error",
        error: error,
      });
    }

    if (!result.length) {
      return res.status(404).send({ msg: "event not found", msgType: "error" });
    }

    let event = result[0];
    if (event.locationvisibility === "discreet") {
      event.locationname = null;
      event.locationaddressline1 = null;
      event.locationaddressline2 = null;
      event.locationaddressline3 = null;
      event.locationcoordinates = null;
      event.otherlocationdetails = null;
    }

    return res
      .status(200)
      .send({ msg: "event retrieved", msgType: "success", event: event });
  });
};
