exports.POST = (req, res) => {
  // Set database
  const isStaging =
    req.headers?.referer?.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Parameters
  const eventid = Number(req.body.eventid) || null;
  const userid = Number(req.body.userid) || null;
  const recipientid = req.body.recipientid || null;

  // Helper:  get invite
  const getInvite = (eventid, userid, recipientid) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          recipientid,
          recipientname,
          sharedvia,
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
        LIMIT 1
        ;
      `;

      db.query(sql, [eventid, userid, recipientid], (error, result) => {
        if (error) {
          console.log(error);
          return reject(error);
        }

        if (!result.length) {
          return reject(new Error("invitation not found"));
        }

        return resolve(result[0]);
      });
    });
  };

  // Helper:  get user
  const getUser = (userid) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          userid,
          firstname,
          lastname,
          gender,
          lang,
          profilephoto
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
          return reject(error);
        }

        if (!result.length) {
          return reject(new Error("user not found"));
        }

        return resolve(result[0]);
      });
    });
  };

  // Helper:  get event
  const getEvent = (eventid) => {
    return new Promise((resolve, reject) => {
      const sql = `
      SELECT
        eventid,
        type,
        title,
        frequency,
        duration,
        durationInHours,
        timezone,
        startdate,
        multidaybegindate,
        multidayenddate,
        hasvirtual,
        contactfirstname,
        contactlastname,
        contactemail,
        contactphone,
        country,
        lang,
        isDeleted,
        createdAt,
        updatedAt
      FROM
        events
      WHERE
        eventid = ?
      LIMIT 1
      ;
    `;

      db.query(sql, [eventid], (error, result) => {
        if (error) {
          console.log(error);
          return reject(error);
        }

        if (!result.length) {
          return reject(new Error("event not found"));
        }

        return resolve(result[0]);
      });
    });
  };

  // MAIN LOGIC

  const event = getEvent(eventid);
  const user = getUser(userid);
  const invite = getInvite(eventid, userid, recipientid);

  Promise.all([event, user, invite]).then((values) => {
    // debugger;
    const event = values[0];
    const user = values[1];
    const recipient = values[2];
    return res.status(200).send({
      msg: "invite info retrieved",
      msgType: "success",
      invite: {
        event: event,
        user: user,
        recipient: recipient,
      },
    });
  });
};
