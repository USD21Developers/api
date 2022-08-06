const moment = require("moment");
const jsonwebtoken = require("jsonwebtoken");

exports.POST = (req, res) => {
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-glc-test")
    : require("../../database-glc");

  const token = req.body.token || "";

  if (!token.length) {
    return res.status(400).send({ msg: "token is required", msgType: "error" });
  }

  if (token.length !== 64) {
    return res.status(400).send({ msg: "invalid token", msgType: "error" });
  }

  const sql = `
    SELECT
      expiry,
      userid,
      claimed,
      utc_timestamp() AS currenttime
    FROM
      tokens
    WHERE
      token = ?
    LIMIT
      1
    ;
  `;

  db.query(sql, [token], (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).send({ msg: "unable to query for token", msgType: "error" });
    }

    if (!result.length) {
      return res.status(404).send({ msg: "token not found", msgType: "error" });
    }

    const currenttime = result[0].currenttime;
    const expiry = result[0].expiry;
    const tokenexpired = moment(expiry).isBefore(currenttime);
    const reconfirmed = result[0].claimed === 1 ? true : false;

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
    const sql = `
      UPDATE
        tokens
      SET
        claimed = 1
      WHERE
        token = ?
      ;
    `;

    db.query(sql, [token], (err, result) => {
      if (err) {
        console.log(err);
        return res
          .status(500)
          .send({ msg: "unable to update token record", msgType: "error" });
      }

      const refreshToken = jsonwebtoken.sign(
        {
          userid: userid
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "30d" }
      );

      const accessToken = jsonwebtoken.sign(
        {
          userid: userid
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "10m" }
      );

      return res.status(200).send({ msg: "token confirmed", msgType: "success", reconfirmed: reconfirmed, refreshToken: refreshToken, accessToken: accessToken })
    });
  });
}