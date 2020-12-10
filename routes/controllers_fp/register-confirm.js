const moment = require("moment");
const db = require("../../database");

exports.POST = (req, res) => {
  const token = req.body.token || "";

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

    const userid = result[0].userid || 0;
    const sql = `UPDATE tokens SET claimed = 1 WHERE token = ?;`;
    db.query(sql, [token], (err, result) => {
      if (err) {
        console.log(err);
        return res
          .status(500)
          .send({ msg: "unable to update token record", msgType: "error" });
      }

      // TODO:  at this point the user is confirmed.  Generate JWT tokens and send them in the response.
    });
  });
};
