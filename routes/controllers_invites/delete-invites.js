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

  // Get request params
  const ids = req.body.ids || null;

  // Validate

  if (!ids) {
    return res.status(400).send({
      msg: "ids is required",
      msgType: "error",
    });
  }

  if (!Array.isArray(ids)) {
    return res.status(400).send({
      msg: "ids must be an array",
      msgType: "error",
    });
  }

  // QUERY

  const sql = `
    UPDATE
      invitations
    SET
      deleted = 1
    WHERE
      userid = ?
    AND
      invitationid IN (?)
    ;
  `;

  db.query(sql, [req.user.userid, [ids]], (error, result) => {
    if (error) {
      return res.status(500).send({
        msg: "unable to delete invitations",
        msgType: "error",
      });
    }

    return res.status(200).send({
      msg: "invites deleted",
      msgType: "success",
      result: result,
    });
  });
};
