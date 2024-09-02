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

  db.query(sql, [req.user.userid], (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).send({
        msg: "unable to query for user",
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

    const isPrivilegedEmailAccount =
      require("./utils").isPrivilegedEmailAccount(email);

    if (!isPrivilegedEmailAccount) {
      return res.status(200).send({
        msg: "unconfirmed",
        msgType: "success",
      });
    }

    const isConfirmedYet =
      canAuthorize === 1 && canAuthToAuth === 1 ? true : false;

    if (!isConfirmedYet) {
      return res.status(200).send({
        msg: "unconfirmed",
        msgType: "success",
      });
    }

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
      msg: "confirmed",
      msgType: "success",
      refreshToken: refreshToken,
      accessToken: accessToken,
    });
  });
};
