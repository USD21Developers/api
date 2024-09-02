const moment = require("moment");

exports.POST = (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["sysadmin", "user"];
  let isAuthorized = false;
  if (allowedUsertypes.includes(usertype)) isAuthorized = true;
  if (!isAuthorized) {
    console.log(`User (userid ${req.user.userid}) is not authorized.`);
    return res.status(401).send({
      msg: "user is not authorized for this action",
      msgType: "error",
    });
  }

  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");
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
      t.userid,
      t.expiry,
      t.claimed,
      utc_timestamp() AS currenttime,
      u.email
    FROM
      tokens t
    INNER JOIN users u ON u.userid = t.userid
    WHERE
      t.token = ?
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
        .status(202)
        .send({ msg: "token already claimed", msgType: "success" });
    }

    const userid = result[0].userid;
    const email = result[0].email;
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
        tokens
      SET
        claimed = 1
      WHERE
        token = ?
      ;
    `;
    db.query(sql, [token], async (err, result) => {
      if (err) {
        console.log(err);
        return res
          .status(500)
          .send({ msg: "unable to update token record", msgType: "error" });
      }

      const isPrivilegedEmailAccount =
        require("./utils").isPrivilegedEmailAccount(email);

      if (!isPrivilegedEmailAccount) {
        return res.status(200).send({
          msg: "email confirmed",
          msgType: "success",
        });
      }

      // Update privileged e-mail account
      const sql = `
        UPDATE
          users
        SET
          canAuthorize = 1,
          canAuthToAuth = 1
        WHERE
          userid = ?
        ;
      `;

      db.query(sql, [userid], (error, result) => {
        if (error) {
          console.log(error);
          return res.status(500).send({
            msg: "unable to elevate user permissions",
            msgType: "error",
          });
        }

        // Return updated refreshToken and accessToken
        const sql = `
          SELECT
            churchid,
            lang,
            userid,
            usertype,
            firstname,
            lastname,
            email,
            username,
            gender,
            profilephoto,
            isAuthorized,
            canAuthorize,
            canAuthToAuth,
            country,
            passwordmustchange
          FROM
            users
          WHERE
            userid = ?
          ;
        `;

        db.query(sql, [userid], (error, result) => {
          if (error) {
            console.log(error);
            return res.status(500).send({
              msg: "unable to retrieve updated account information",
              msgType: "error",
            });
          }

          if (!result.length) {
            return res.status(404).send({
              msg: "account no longer exists",
              msgType: "error",
            });
          }

          const {
            churchid,
            lang,
            userid,
            usertype,
            firstname,
            lastname,
            email,
            username,
            gender,
            profilephoto,
            isAuthorized,
            canAuthorize,
            canAuthToAuth,
            country,
            passwordmustchange,
          } = result[0];

          const jsonwebtoken = require("jsonwebtoken");

          const refreshToken = jsonwebtoken.sign(
            {
              churchid: churchid,
              country: country,
              lang: lang,
              userid: userid,
              usertype: usertype,
              firstname: firstname,
              lastname: lastname,
              email: email,
              username: username,
              gender: gender,
              profilephoto: profilephoto,
              mapsApiKeys: {
                prod: process.env.GOOGLE_MAPS_API_KEY_PROD,
                staging: process.env.GOOGLE_MAPS_API_KEY_STAGING,
                dev: process.env.GOOGLE_MAPS_API_KEY_DEV,
              },
              isAuthorized: isAuthorized,
              canAuthorize: canAuthorize,
              canAuthToAuth: canAuthToAuth,
            },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "30d" }
          );

          const accessToken = jsonwebtoken.sign(
            {
              churchid: churchid,
              userid: userid,
              usertype: usertype,
              lang: lang,
              profilephoto: profilephoto,
              country: country,
              passwordmustchange: passwordmustchange,
              isAuthorized: isAuthorized,
              canAuthorize: canAuthorize,
              canAuthToAuth: canAuthToAuth,
            },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "10m" }
          );

          return res.status(200).send({
            msg: "email confirmed",
            msgType: "success",
            refreshToken: refreshToken,
            accessToken: accessToken,
          });
        });
      });
    });
  });
};
