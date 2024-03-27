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

  // Query for userid
  const sql = `
    SELECT
      userid,
      churchid,
      username,
      firstname,
      lastname,
      email,
      gender,
      usertype,
      userstatus,
      profilephoto,
      lang,
      country,
      createdAt
    FROM
      users
    WHERE
      userid = ?
    LIMIT 1
    ;
  `;
  db.query(sql, [req.user.userid], (err, result) => {
    if (err) {
      console.log(err);
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

    const user = result[0];

    res.status(200).send({
      msg: "user retrieved",
      msgType: "success",
      user: user,
    });
  });
};
