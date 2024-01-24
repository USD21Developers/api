function getEvent(db, eventid) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        eventid,
        frequency,
        isDeleted,
        lang,
        multidaybegindate, 
        multidayenddate, 
        startdate, 
        timezone,
        title, 
        type        
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
        reject(error);
      }

      if (!result.length) {
        const errorMsg = "event not found";
        console.log(errorMsg);
        reject(new Error(errorMsg));
      }

      resolve(result[0]);
    });
  });
}

function getInvite(db, invitationid, userid) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        eventid,
        invitationid,
        invitedAt,
        lang,
        recipientname,
        sharedvia,
        userid
      FROM
        invitations
      WHERE
        invitationid = ?
      AND
        userid = ?
      LIMIT 1
      ;
    `;

    db.query(sql, [invitationid, userid], (error, result) => {
      if (error) {
        console.log(error);
        reject(error);
      }

      if (!result.length) {
        const errorMsg = "invite not found";
        console.log(errorMsg);
        reject(new Error(errorMsg));
      }

      return resolve(result[0]);
    });
  });
}

function getUser(db, userid) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        userid,
        firstname,
        lastname
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
        reject(error);
      }

      if (!result.length) {
        const errorMsg = "user not found";
        console.log(errorMsg);
        reject(new Error(errorMsg));
      }

      return resolve(result[0]);
    });
  });
}

exports.POST = (req, res) => {
  // Set database
  const isStaging =
    req.headers?.referer?.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Parameters
  const jwt = req.body.jwt || null;

  // Validate
  if (!jwt) {
    return res.status(404).send({
      msg: "invite not retrieved",
      msgType: "error",
    });
  }

  const jsonwebtoken = require("jsonwebtoken");
  jsonwebtoken.verify(
    jwt,
    process.env.INVITES_HMAC_SECRET,
    async (err, jwtData) => {
      if (err) {
        return res.status(403).send({
          msg: "invalid unsubscribe token",
          msgType: "error",
          err: err,
        });
      }

      const { invitationid, userid } = jwtData;
      const invite = await getInvite(db, invitationid, userid).catch(
        () => null
      );

      if (!invite) {
        return res.status(404).send({
          msg: "invite not retrieved",
          msgType: "error",
        });
      }

      const event = await getEvent(db, invite.eventid).catch(() => null);
      const user = await getUser(db, invite.userid).catch(() => null);

      let isDataComplete = true;
      if (!invite) isDataComplete = false;
      if (!event) isDataComplete = false;
      if (!user) isDataComplete = false;

      if (!isDataComplete) {
        return res.status(404).send({
          msg: "invite not retrieved",
          msgType: "error",
        });
      }

      return res.status(200).send({
        msg: "invite retrieved",
        msgType: "success",
        invite: {
          invite: invite,
          event: event,
          user: user,
        },
      });
    }
  );
};
