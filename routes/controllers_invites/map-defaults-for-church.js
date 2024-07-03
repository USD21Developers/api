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

  // Set database
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  const sql = `
    SELECT
      latitude,
      longitude,
      zoom
    FROM
      churchmaps
    WHERE
      churchid = (SELECT churchid FROM users WHERE userid = ? LIMIT 1)
    LIMIT 1
    ;
  `;

  db.query(sql, [req.user.userid], (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).send({
        msg: "unable to query for map defaults for church",
        msgType: "error",
      });
    }

    if (!result.length) {
      return res.status(404).send({
        msg: "map defaults for user's church not found",
        msgType: "error",
      });
    }

    return res.status(200).send({
      msg: "map defaults for user's church retrieved",
      msgType: "success",
      mapDefaults: result[0],
    });
  });
};
