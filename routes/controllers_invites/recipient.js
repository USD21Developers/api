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

  const invitationid = req.body.invitationid || "";

  if (invitationid === "") {
    return res.status(400).send({
      msg: "invalid invitation id",
      msgType: "error",
    });
  }

  const sql = `
    SELECT
      *
    FROM
      invitations
    WHERE
      invitationid = ?
    LIMIT
      1
    ;
  `;

  db.query(sql, [invitationid], (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).send({
        msg: "unable to query for invite",
        msgType: "error",
      });
    }

    if (!result.length) {
      return res.status(404).send({
        msg: "invite not found",
        msgType: "error",
      });
    }

    const recipient = result[0];

    res.status(200).send({
      msg: "recipient retrieved",
      msgType: "success",
      recipient: recipient,
    });
  });
};
