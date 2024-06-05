exports.POST = async (req, res) => {
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

  // Set database
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Parameters
  const profileImage140 = req.body.profileImage140 || "";
  const profileImage400 = req.body.profileImage400 || "";

  // Validate

  if (!profileImage140.length)
    return res
      .status(400)
      .send({ msg: "140x140 profile photo missing", msgType: "error" });

  if (!profileImage400.length)
    return res
      .status(400)
      .send({ msg: "400x400 profile photo missing", msgType: "error" });

  await require("./utils").storeProfileImage(
    req.user.userid,
    profileImage400,
    profileImage140,
    db
  );

  const sql = `
    SELECT
      churchid,
      country,
      lang,
      userid,
      usertype,
      firstname,
      lastname,
      gender,
      profilephoto,
      passwordmustchange,
      isAuthorized,
      canAuthorize,
      canAuthToAuth
    FROM
      users
    WHERE
      userid = ?
    LIMIT 1
    ;
  `;

  db.query(sql, [req.user.userid], (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).send({
        msg: "unable to update profile photo",
        msgType: "error",
      });
    }

    if (!result.length) {
      return res.status(404).send({
        msg: "account not found",
        msgType: "error",
        userid: req.user.userid,
      });
    }

    const {
      churchid,
      country,
      lang,
      email,
      username,
      userid,
      usertype,
      firstname,
      lastname,
      gender,
      profilephoto,
      passwordmustchange,
      isAuthorized,
      canAuthorize,
      canAuthToAuth,
    } = result[0];

    const jsonwebtoken = require("jsonwebtoken");

    const refreshToken = jsonwebtoken.sign(
      {
        churchid: churchid,
        country: country,
        lang: lang,
        email: email,
        username: username,
        userid: userid,
        usertype: usertype,
        firstname: firstname,
        lastname: lastname,
        gender: gender,
        profilephoto: profilephoto,
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
      msg: "photo updated",
      msgType: "success",
      refreshToken: refreshToken,
      accessToken: accessToken,
    });
  });
};
