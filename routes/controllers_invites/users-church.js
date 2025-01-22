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

  // Params
  const churchid = Number(req.body.churchid) || null;

  // Validate
  if (!churchid) {
    return res.status(400).send({
      msg: "churchid is required",
      msgType: "error",
    });
  }
  if (typeof churchid !== "number") {
    return res.status(400).send({
      msg: "churchid must be a number",
      msgType: "error",
    });
  }
  if (churchid <= 0) {
    return res.status(400).send({
      msg: "churchid must be a positive integer",
      msgType: "error",
    });
  }

  // Fetch data
  const sql = `
    SELECT
      userid,
      firstname,
      lastname,
      gender,
      profilephoto,
      lang,
      cameToFaithViaApp,
      usertype,
      canAuthorize,
      canAuthToAuth,
      userstatus,
      createdAt,
      updatedAt
    FROM
      users
    WHERE
      churchid = ?
    AND
      isAuthorized = 1
    AND
      userstatus = 'registered'
    ORDER BY
      createdAt DESC,
      lastname,
      firstname
    ;
  `;

  db.query(sql, [churchid], (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).send({
        msg: "unable to query for users",
        msgType: "error",
      });
    }

    return res.status(200).send({
      msg: "users retrieved",
      msgType: "success",
      users: result,
    });
  });
};
