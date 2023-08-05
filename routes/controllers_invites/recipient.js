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

  const eventid = req.body.eventid || "";
  const userid = req.body.userid || "";
  const recipientid = req.body.recipientid || "";

  if (eventid === "") {
    return res.status(400).send({
      msg: "invalid event id",
      msgType: "error",
    });
  }

  if (userid === "") {
    return res.status(400).send({
      msg: "invalid user id",
      msgType: "error",
    });
  }

  if (recipientid === "") {
    return res.status(400).send({
      msg: "invalid recipient id",
      msgType: "error",
    });
  }

  const sql = `
    SELECT
      *
    FROM
      invitations
    WHERE
      eventid = ?
    AND
      userid = ?
    AND
      recipientid = ?
    LIMIT
      1
    ;
  `;

  db.query(sql, [eventid, userid, recipientid], (error, result) => {
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
