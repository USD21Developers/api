const moment = require("moment");

const updatePreAuth = (db, preAuth, userId) => {
  return new Promise((resolve, reject) => {
    const { churchid, authorizedby, authcode } = preAuth;
    const sql = `
          UPDATE
            preauth
          SET
            claimedAt = UTC_TIMESTAMP(),
            userid = ?
          WHERE
            claimedAt IS NULL
          AND
            userid IS NULL
          AND
            churchid = ?
          AND
            authorizedby = ?
          AND
            authcode = ?
          ;
        `;

    db.query(
      sql,
      [userId, churchid, authorizedby, authcode],
      (error, result) => {
        if (error) {
          return reject(error);
        }

        return resolve();
      }
    );
  });
};

exports.POST = (req, res) => {
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");
  const token = req.body.token || "";
  const preAuth = req.body.preAuth || null;

  // Validate

  if (!token.length) {
    return res.status(400).send({ msg: "token is missing", msgType: "error" });
  }

  if (token.length !== 64) {
    return res.status(400).send({ msg: "token is invalid", msgType: "error" });
  }

  // Query

  const sql = `
    SELECT
      userid,
      expiry,
      claimed,
      utc_timestamp() AS currenttime
    FROM
      tokens
    WHERE
      token = ?
    AND
      purpose = 'registration'
    LIMIT
      1
    ;
  `;
  db.query(sql, [token], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({
        msg: "unable to query for token",
        msgType: "error",
        error: err,
      });
    }

    if (!result.length) {
      return res.status(404).send({ msg: "token not found", msgType: "error" });
    }

    if (result[0].claimed === 1) {
      return res
        .status(401)
        .send({ msg: "token already claimed", msgType: "error" });
    }

    const userId = result[0].userid;
    const currenttime = result[0].currenttime;
    const expiry = result[0].expiry;
    const tokenexpired = moment(expiry).isBefore(currenttime);

    if (tokenexpired) {
      return res.status(401).send({
        msg: "token expired",
        msgType: "error",
        utcExpiry: expiry,
        utcNow: currenttime,
      });
    }

    // Token valid; update database

    const sql = `
      UPDATE
        tokens t
      INNER JOIN
        users u
      SET
        t.claimed = 1,
        u.userstatus = 'registered'
      WHERE
        t.token = ?
      ;
    `;
    db.query(sql, [token], async (err, result) => {
      if (err) {
        console.log(err);
        return res
          .status(500)
          .send({ msg: "unable to update token record", msgType: "error" });
      }

      // Set status of pre-authorization to claimed
      if (preAuth) {
        await updatePreAuth(db, preAuth, userId);
      }

      // Registration confirmed
      return res.status(200).send({
        msg: "registration confirmed",
        msgType: "success",
      });
    });
  });
};
