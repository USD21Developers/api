exports.POST = (req, res) => {
  // Set database
  const isStaging =
    req.headers?.referer?.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  let eventid = req.query.eventid || "";
  let userid = req.query.userid || "";
  const recipientid = req.query.recipientid || "";

  // Validate eventid
  try {
    eventid = parseInt(req.query.eventid);
  } catch (e) {
    console.log(e);
  }
  if (typeof eventid !== "number") {
    return res.status(400).send({
      msg: "eventid must be numeric",
      msgType: "error",
    });
  }

  // Query for event
  const sql = `
    SELECT
      *
    FROM
      events
    WHERE
      eventid = ?
    LIMIT
      1
    ;
  `;

  db.query(sql, [eventid], (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).send({
        msg: "unable to query for event",
        msgType: "error",
      });
    }

    if (!result.length) {
      return res.status(404).send({
        msg: "event not found",
        msgType: "error",
        eventid: eventid,
      });
    }

    const eventObject = result[0];

    /* {
      "eventid": 2,
      "churchid": 7,
      "createdBy": 1,
      "type": "bible talk",
      "title": "Bible Talk",
      "description": "asdf\nasdf\nasd\nf",
      "frequency": "Every Friday",
      "duration": null,
      "durationInHours": 1.5,
      "timezone": "America/Phoenix",
      "startdate": "2023-04-01T09:30:00.000Z",
      "multidaybegindate": null,
      "multidayenddate": null,
      "locationvisibility": "public",
      "locationname": "McNeill's Household",
      "locationaddressline1": "3328 W. Kimberly Way",
      "locationaddressline2": "Phoenix, AZ",
      "locationaddressline3": null,
      "locationcoordinates": {
          "x": 33.6578282,
          "y": -112.1317011
      },
      "otherlocationdetails": null,
      "virtualconnectiondetails": null,
      "sharewithfollowers": "yes",
      "hasvirtual": 0,
      "contactfirstname": "Jason",
      "contactlastname": "McNeill",
      "contactemail": "vrtjason@gmail.com",
      "contactphone": "+17143179955",
      "contactphonecountrydata": "{\"iso2\": \"us\", \"name\": \"United States\", \"dialCode\": \"1\", \"priority\": 0, \"areaCodes\": null}",
      "country": "us",
      "lang": "en",
      "isDeleted": 0,
      "createdAt": "2023-03-30T03:38:43.000Z",
      "updatedAt": "2023-03-29T20:38:43.000Z"
    } */

    // Validate userid
    try {
      userid = parseInt(req.query.userid);
    } catch (e) {
      console.log(e);
    }
    if (typeof userid !== "number") {
      return res.status(400).send({
        msg: "userid not found",
        msgType: "error",
        userid: userid,
        event: eventObject,
      });
    }

    // Query for user
    const sql = `
      SELECT
        userid,
        churchid,
        firstname,
        lastname,
        gender,
        profilephoto,
        lang,
        country
      FROM
        users
      WHERE
        userid = ?
      ;
    `;

    db.query(sql, [userid], (error, result) => {
      if (error) {
        console.log(error);
        return res.status(500).send({
          msg: "unable to query for user",
          msgType: "error",
          userid: userid,
          event: eventObject,
        });
      }

      if (!result.length) {
        return res.status(404).send({
          msg: "user not found",
          msgType: "error",
          userid: userid,
          event: eventObject,
        });
      }

      const userObject = result[0];

      // Query for recipient
      const sql = `
        SELECT
          recipientname,
          sharedfromtimezone,
          lang,
          invitedAt
        FROM
          invitations
        WHERE
          eventid = ?
        AND
          userid = ?
        AND
          recipientid = ?
        LIMIT
          1
        ;
      `;

      db.query(sql, [eventid, userid, recipientid], (error, result) => {
        if (error) {
          console.log(error);
          return res.status(500).send({
            msg: "unable to query for recipient",
            msgType: "error",
            user: userObject,
            event: eventObject,
            recipientid: recipientid,
          });
        }

        if (!result.length) {
          return res.status(404).send({
            msg: "recipient not found",
            msgType: "error",
            user: userObject,
            event: eventObject,
            recipientid: recipientid,
          });
        }

        const recipientObject = result[0];

        return res.status(200).send({
          msg: "invite retrieved",
          msgType: "success",
          user: userObject,
          event: eventObject,
          recipient: recipientObject,
        });
      });
    });
  });
};
