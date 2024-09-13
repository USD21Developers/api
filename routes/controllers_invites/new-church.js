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
  const countryid = req.body.countryid ? Number(req.body.countryid) : null;
  const churchid = req.body.churchid ? Number(req.body.churchid) : null;
  const unlistedChurch = req.body.unlistedChurch
    ? req.body.unlistedChurch
    : null;

  const handleUnlistedChurch = (db, countryid, unlistedChurch) => {
    return new Promise((resolve, reject) => {
      // TODO: notify admin that this church needs to be added
    });
  };

  if (!countryid) {
    return res.status(400).send({
      msg: "countryid is required",
      msgType: "error",
    });
  }

  if (!churchid) {
    if (!unlistedChurch) {
      return res.status(400).send({
        msg: "unlistedChurch is required",
        msgType: "error",
      });
    }

    const response = await handleUnlistedChurch(db, countryid, unlistedChurch);
    return res.status(200).send({
      msg: "admin notified to update churches with unlisted church",
      msgType: "success",
      response: response,
    });
  }

  const sql = `
    UPDATE
      users
    SET
      churchid = ?,
      country = ?
    WHERE
      userid = ?
    ;
  `;

  db.query(sql, [churchid, countryid, req.user.userid], (error, result) => {
    if (error) {
      return res.status(500).send({
        msg: "unable to update churchid",
        msgType: "error",
      });
    }

    return res.status(200).send({
      msg: "churchid updated",
      msgType: "success",
    });
  });
};
