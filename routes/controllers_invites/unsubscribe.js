const jsonwebtoken = require("jsonwebtoken");

function unsubscribeFromInvite(db, invitationid, userid) {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE
        invitations
      SET
        unsubscribedFromEmail = 1,
        unsubscribedFromEmailAt = UTC_TIMESTAMP(),
        unsubscribedFromPush = 1,
        unsubscribedFromPushAt = UTC_TIMESTAMP()
      WHERE
        userid = ?
      AND
        invitationid = ?
      ;
    `;

    db.query(sql, [userid, invitationid], (error, result) => {
      if (error) {
        console.log(error);
        return reject(error);
      }

      const resultObj = {
        affectedRows: result.affectedRows,
        changedRows: result.changedRows,
      };

      return resolve(resultObj);
    });
  });
}

function unsubscribeFromRecipient(db, invitationids, invitationid, userid) {
  return new Promise((resolve, reject) => {
    if (!invitationids.includes(invitationid)) {
      const errMsg = "invitationid must match the invitationid in the JWT";
      console.log(errMsg);
      return reject(new Error(errMsg));
    }

    const sql = `
      UPDATE
        invitations
      SET
        unsubscribedFromEmail = 1,
        unsubscribedFromEmailAt = UTC_TIMESTAMP(),
        unsubscribedFromPush = 1,
        unsubscribedFromPushAt = UTC_TIMESTAMP()
      WHERE
        userid = ?
      AND
        invitationid IN ?
    `;

    db.query(sql, [userid, [invitationids]], (error, result) => {
      if (error) {
        return reject(error);
      }

      const resultObj = {
        affectedRows: result.affectedRows,
        changedRows: result.changedRows,
      };

      return resolve(resultObj);
    });
  });
}

function unsubscribeFromApp(db, userid) {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE users
      SET settings = JSON_SET(settings, '$.enablePushNotifications', false, '$.enableEmailNotifications', false)
      WHERE userid = ?;    
    `;

    db.query(sql, [userid], (error, result) => {
      if (error) {
        return reject(error);
      }

      const resultObj = {
        affectedRows: result.affectedRows,
        changedRows: result.changedRows,
      };

      return resolve(resultObj);
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

  res.setHeader("Referrer-Policy", "no-referrer");

  // Parameters
  const { invitationids, jwt, unsubscribeFrom } = req.body;

  // Validate unsubscribeFrom

  if (!unsubscribeFrom) {
    const errMsg = "parameter unsubscribeFrom is required";
    console.log(errMsg);
    return res.status(400).send({
      msg: errMsg,
      msgType: "error",
    });
  }

  if (!["invite", "recipient", "app"].includes(unsubscribeFrom)) {
    const errMsg = "parameter unsubscribeFrom is invalid";
    console.log(errMsg);
    return res.status(400).send({
      msg: errMsg,
      msgType: "error",
    });
  }

  // Validate invitationids
  if (unsubscribeFrom === "recipient") {
    if (!Array.isArray(invitationids)) {
      const errMsg = "invitationids must be an array";
      console.log(errMsg);
      return res.status(400).send({
        msg: errMsg,
        msgType: "error",
      });
    }
  }

  // Validate jwt

  if (!jwt) {
    const errMsg = "parameter jwt is required";
    console.log(errMsg);
    return res.status(400).send({
      msg: errMsg,
      msgType: "error",
    });
  }

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

      let unsubscription;

      if (unsubscribeFrom === "invite") {
        unsubscription = await unsubscribeFromInvite(db, invitationid, userid);
      } else if (unsubscribeFrom === "recipient") {
        unsubscription = await unsubscribeFromRecipient(
          db,
          invitationids,
          invitationid,
          userid
        );
      } else if (unsubscribeFrom === "app") {
        unsubscription = await unsubscribeFromApp(db, userid);
      }

      return res.status(200).send({
        msg: "unsubscribe successful",
        msgType: "success",
        result: unsubscription,
      });
    }
  );
};
