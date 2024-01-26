const jsonwebtoken = require("jsonwebtoken");

exports.POST = (req, res) => {
  // Set database
  const isStaging =
    req.headers?.referer?.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Parameters
  const { invitationids, jwt, unsubscribeFrom } = req.body;

  // Validate invitationids
  if (!Array.isArray(invitationids)) {
    const errMsg = "invitationids must be an array";
    console.log(errMsg);
    return res.status(400).send({
      msg: errMsg,
      msgType: "error",
    });
  }

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

  // Validate jwt

  if (!jwt) {
    const errMsg = "parameter jwt is required";
    console.log(errMsg);
    return res.status(400).send({
      msg: errMsg,
      msgType: "error",
    });
  }

  jsonwebtoken.verify(jwt, process.env.INVITES_HMAC_SECRET, (err, jwtData) => {
    if (err) {
      return res.status(403).send({
        msg: "invalid unsubscribe token",
        msgType: "error",
        err: err,
      });
    }

    const { invitationid, userid } = jwtData;

    if (!invitationids.includes(invitationid)) {
      const errMsg = "invitationid must match the invitationid in the JWT";
      console.log(errMsg);
      return res.status(403).send({
        msg: errMsg,
        msgType: "error",
      });
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
        console.log(error);
        return res.status(500).send({
          msg: "unable to unsubscribe",
          msgType: "error",
        });
      }

      return res.status(200).send({
        msg: "unsubscription successful",
        msgType: "success",
      });
    });
  });

  /* return res.status(200).send({
    msg: "unsubscribe successful",
    msgType: "success",
  }); */
};
