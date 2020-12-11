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

      const sql = `SELECT fullname, usertype, passwordmustchange FROM users WHERE userid = ? LIMIT 1;`;
      db.query(sql, [userid], (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(500)
            .send({ msg: "unable to query for user", msgType: "error" });
        }

        if (!result.length) {
          return res
            .status(404)
            .send({ msg: "user not found", msgType: "error" });
        }

        // Registration confirmed; send JWT
        const jsonwebtoken = require("jsonwebtoken");
        const { fullname, usertype, passwordmustchange } = result;
        const refreshToken = jsonwebtoken.sign(
          {
            name: fullname,
            userid: userid,
            usertype: usertype,
            passwordmustchange: passwordmustchange == 1 ? true : 0,
          },
          process.env.REFRESH_TOKEN_SECRET,
          { expiresIn: "90d" }
        );

        const accessToken = jsonwebtoken.sign(
          {
            name: fullname,
            userid: userid,
            usertype: usertype,
            passwordmustchange: passwordmustchange == 1 ? true : 0,
          },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "10m" }
        );

        return res.status(200).send({
          msg: "registration confirmed",
          msgType: "success",
          refreshToken: refreshToken,
          accessToken: accessToken,
        });
      });
    });
  });
};
