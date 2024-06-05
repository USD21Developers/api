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
  let invitationid = req.body.invitationid || null;

  // Validate
  if (isNaN(invitationid)) {
    return res.status(400).send({
      msg: "invitationid must be numeric",
      msgType: "error",
    });
  }

  invitationid = Math.abs(Number(req.body.invitationid));

  // Query
  const sql = `
    UPDATE
      invitations
    SET
      isDeleted = 0
    WHERE
      userid = ?
    AND
      invitationid = ?
    ;
  `;

  db.query(sql, [req.user.userid, invitationid], (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).send({
        msg: "unable to undelete invitation",
        msgType: "error",
      });
    }

    return res.status(200).send({
      msg: "invitation undeleted",
      msgType: "success",
      affectedRows: result.affectedRows,
      changedRows: result.changedRows,
    });
  });
};
