exports.POST = async (req, res) => {
  // Set database
  const isLocal =
    req.headers.referer.includes("localhost") ||
    req.headers.referer.includes("127.0.0.1")
      ? true
      : false;
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Params

  const eventid = req.body.eventid || null;
  const userid = req.body.userid || null;
  const recipientid = req.body.recipientid || null;
  const emailHtml = req.body.emailHtml || null;
  const emailPhrases = req.body.emailPhrases || null;
  const pushMessageText = req.body.pushMessageText || null;

  // Validate

  if (!eventid) {
    return res.status(400).send({
      msg: "eventid is required",
      msgType: "error",
    });
  }

  if (typeof eventid !== "number") {
    return res.status(400).send({
      msg: "eventid must be numeric",
      msgType: "error",
    });
  }

  if (!userid) {
    return res.status(400).send({
      msg: "userid is required",
      msgType: "error",
    });
  }

  if (typeof userid !== "number") {
    return res.status(400).send({
      msg: "userid must be numeric",
      msgType: "error",
    });
  }

  if (!recipientid) {
    return res.status(400).send({
      msg: "recipientid is required",
      msgType: "error",
    });
  }

  if (recipientid.length !== 5) {
    return res.status(400).send({
      msg: "recipientid must be 5-characters",
      msgType: "error",
    });
  }

  if (!emailHtml) {
    return res.status(400).send({
      msg: "emailHtml is required",
      msgType: "error",
    });
  }

  if (!emailPhrases) {
    return res.status(400).send({
      msg: "emailPhrases is required",
      msgType: "error",
    });
  }

  if (!pushMessageText) {
    return res.status(400).send({
      msg: "pushMessageText is required",
      msgType: "error",
    });
  }

  const getEvent = (eventid) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          *,
          CASE 
            WHEN frequency != 'once' AND startdate < CURDATE() THEN CONCAT(DATE_FORMAT(DATE_ADD(startdate, INTERVAL (DATEDIFF(CURDATE(), startdate) DIV 7 + 1) * 7 DAY), '%Y-%m-%dT%H:%i:%s'), 'Z')
            ELSE CONCAT(DATE_FORMAT(startdate, '%Y-%m-%dT%H:%i:%s'), 'Z')
          END AS startdateNext,
          (
            SELECT COUNT(*)
            FROM events 
            WHERE eventid = ? 
            AND (
              DATE_ADD(startdate, INTERVAL durationInHours HOUR) < NOW() 
              OR 
              multidayenddate < NOW()
            )
          ) AS isPast
        FROM
          events
        WHERE
          eventid = ?
        LIMIT
          1
        ;
      `;

      db.query(sql, [eventid, eventid, eventid], (error, result) => {
        if (error) {
          console.log(error);
          return reject(new Error("unable to query for event"));
        }

        if (!result.length) {
          return reject(new Error("event not found"));
        }

        const removeLocationInfoFromDiscreetEvents =
          require("./utils").removeLocationInfoFromDiscreetEvents;

        let event;

        event = removeLocationInfoFromDiscreetEvents(result);

        return resolve(event[0]);
      });
    });
  };

  const getInvite = (eventid, userid, recipientid) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          invitationid,
          eventid,
          userid,
          recipientid,
          lastTimeNotifiedViaEmail,
          lastTimeNotifiedViaPush,
          recipientname,
          unsubscribedfromemail,
          unsubscribedfrompush,
          invitedAt
        FROM
          invitations
        WHERE
          eventid = ?
        AND
          userid = ?
        AND
          recipientid = ?
        LIMIT 1
        ;
      `;

      db.query(sql, [eventid, userid, recipientid], (error, result) => {
        if (error) {
          console.log(error);
          return reject(new Error("unable to query for invitation"));
        }

        if (!result.length) {
          return reject(new Error("invitation not found"));
        }

        return resolve(result[1]);
      });
    });
  };

  const getUser = (userid) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          churchid,
          firstname,
          lastname,
          email,
          gender,
          lang,
          settings
        FROM
          users
        WHERE
          userid = ?
        LIMIT 1
        ;
      `;

      db.query(sql, [userid], (error, result) => {
        if (error) {
          console.log(error);
          return reject(new Error("unable to query for user"));
        }

        if (!result.length) {
          return reject(new Error("user not found"));
        }

        return resolve(result[0]);
      });
    });
  };

  const invitationObj = await getInvite(invitationid);
  if (!invitationObj) {
    return res.send({
      msg: "invalid invitation data",
      msgType: "error",
    });
  }

  const userObj = await getUser(userid);
  if (!userObj) {
    return res.send({
      msg: "invalid user data",
      msgType: "error",
    });
  }

  const eventObj = await getEvent(eventid);
  if (!eventObj) {
    return res.send({
      msg: "invalid event data",
      msgType: "error",
    });
  }

  // TODO:  record the RSVP as an interaction
  // TODO:  check if user was already notified less than 24 hours ago
  // TODO:  check if user is unsubscribed from email or push notifications for this specific invite
  // TODO:  check if user id has turned off email or push notifications
  // TODO:  notify via push, if necessary
  // TODO:  notify via e-mail, if necessary
};
