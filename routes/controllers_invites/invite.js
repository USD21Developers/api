const moment = require("moment");

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

      // Does user exist?

      db.query(sql, [userid], (error, result) => {
        if (error) {
          console.log(error);
          return reject(new Error("unable to query for user"));
        }

        if (!result.length) {
          // User does NOT exist. Return an error.
          return reject(new Error("user not found"));
        }

        // User does exist!

        const userObject = result[0];

        const sql = `
          SELECT
            title
          FROM
            events
          WHERE
            eventid = ?
          AND
            createdBy = ?
          LIMIT
            1
          ;
        `;

        // Did user create the event?

        db.query(sql, [eventid, userid], (error, result) => {
          if (error) {
            console.log(error);
            return reject(new Error("unable to query for user's events"));
          }

          if (result.length) {
            // User DID create the event! Return the user object:
            return resolve(userObject);
          }

          const sql = `
            SELECT
              title
            FROM
              events e
            INNER JOIN follow f ON f.follower = ?
            WHERE
              e.eventid = ?
            AND
              e.createdBy = f.followed
            LIMIT
              1
            ;
          `;

          // User did NOT create the event. Did user send it by following another user?

          db.query(sql, [userid, eventid], (error, result) => {
            if (error) {
              console.log(error);
              return reject(
                new Error("unable to query for events followed by user")
              );
            }

            if (!result.length) {
              // User did NOT send this event by following another user. Return an error:
              return reject(new Error("user not associated with event"));
            }

            // User sent the event by following another user! Return the user object:
            return resolve(userObject);
          });
        });
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
    if (event.frequency !== "once") {
      event.startDateOriginal =
        moment(event.startdate).format("YYYY-MM-DDTHH:mm:ss") + "Z";
      event.startdate = event.startdateNext;
      delete event.startdateNext;
    }
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
