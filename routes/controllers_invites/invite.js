exports.POST = (req, res) => {
  // Set database
  const isStaging =
    req.headers?.referer?.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  const eventid = Number(req.body.eventid) || null;
  const userid = Number(req.body.userid) || null;
  const recipientid = req.body.recipientid || null;

  // Validate eventid
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

  const getEvent = (db, eventid) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          *,
          (
            SELECT 1 
            FROM events 
            WHERE eventid = ? 
            AND (
              startdate < NOW() 
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

        return resolve(result[0]);
      });
    });
  };

  const getUser = (db, userid) => {
    return new Promise((resolve, reject) => {
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
          return reject(new Error("unable to query for user"));
        }

        if (!result.length) {
          return reject(new Error("user not found"));
        }

        return resolve(result[0]);
      });
    });
  };

  const getRecipient = (db, eventid, userid, recipientid) => {
    return new Promise((resolve, reject) => {
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
          return reject(new Error("unable to query for recipient"));
        }

        if (!result.length) {
          return reject(new Error("recipient not found"));
        }

        return resolve(result[0]);
      });
    });
  };

  (async (db, res) => {
    const event = eventid
      ? await getEvent(db, eventid).catch(() => null)
      : null;
    const user = userid ? await getUser(db, userid).catch(() => null) : null;
    const recipient =
      eventid && userid && recipientid
        ? await getRecipient(db, eventid, userid, recipientid).catch(() => null)
        : null;
    return res.status(200).send({
      msg: "invite retrieved",
      msgType: "success",
      invite: {
        event: event,
        user: user,
        recipient: recipient,
      },
    });
  })(db, res);
};
