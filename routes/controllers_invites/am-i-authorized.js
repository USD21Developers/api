const jsonwebtoken = require("jsonwebtoken");

exports.POST = (req, res) => {
  // Params
  const jwt = req.body.userToken || null;

  // Validate
  if (!jwt) {
    return res.status(400).send({
      msg: "userToken is required",
      msgType: "error",
    });
  }

  jsonwebtoken.verify(jwt, process.env.ACCESS_TOKEN_SECRET, (err, userData) => {
    if (err) {
      return res
        .status(403)
        .send({ msg: "invalid userToken", msgType: "error" });
    }

    // Set database
    const isStaging =
      req.headers.referer.indexOf("staging") >= 0 ? true : false;
    const db = isStaging
      ? require("../../database-invites-test")
      : require("../../database-invites");

    const sql = `
        SELECT
          isAuthorized
        FROM
          users
        WHERE
          userid = ?
        ;
      `;

    // User must be registered
    const usertype = userData.usertype;
    const allowedUsertypes = ["sysadmin", "user"];
    let isAuthorized = false;
    if (allowedUsertypes.includes(usertype)) isAuthorized = true;
    if (!isAuthorized) {
      console.log(`User (userid ${userData.userid}) is not authorized.`);
      return res.status(401).send({
        msg: "user is not authorized for this action",
        msgType: "error",
      });
    }

    db.query(sql, [userData.userid], async (error, result) => {
      if (error) {
        console.log(error);
        return res.status(500).send({
          msg: "unable to check if user is authorized",
          msgType: "error",
        });
      }

      if (!result.length) {
        return res.status(404).send({
          msg: "user not found",
          msgType: "error",
        });
      }

      if (result[0].isAuthorized !== 1) {
        return res.status(200).send({
          msg: "not authorized",
          msgType: "success",
        });
      }

      const sql = `
          SELECT
            userid,
            churchid,
            firstname,
            lastname,
            nameDisplayedOnInvite,
            email,
            username,
            gender,
            usertype,
            lang,
            profilephoto,
            country,
            passwordmustchange,
            isAuthorized,
            canAuthorize,
            canAuthToAuth
          FROM
            users
          WHERE
            userid = ?
          LIMIT
            1
          ;
        `;

      db.query(sql, [userData.userid], (error, result) => {
        if (error) {
          console.log(error);
          return res.status(500).send({
            msg: "unable to query for authorized user",
            msgType: "error",
          });
        }

        if (!result.length) {
          return res.status(404).send({
            msg: "user not found",
            msgType: "error",
          });
        }

        const {
          userid,
          churchid,
          firstname,
          lastname,
          nameDisplayedOnInvite,
          email,
          username,
          gender,
          usertype,
          lang,
          profilephoto,
          country,
          passwordmustchange,
          isAuthorized,
          canAuthorize,
          canAuthToAuth,
        } = result[0];

        const refreshToken = jsonwebtoken.sign(
          {
            churchid: churchid,
            country: country,
            lang: lang,
            userid: userid,
            usertype: usertype,
            firstname: firstname,
            lastname: lastname,
            nameDisplayedOnInvite: nameDisplayedOnInvite,
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
          msg: "authorization status verified",
          msgType: "success",
          result: "authorized",
          refreshToken: refreshToken,
          accessToken: accessToken,
        });
      });
    });
  });
};
