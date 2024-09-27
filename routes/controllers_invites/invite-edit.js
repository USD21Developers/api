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
  const invitationid = req.body.invitationid || null;
  const name = req.body.name || null;
  let email = req.body.email || null;
  let phoneNumber = req.body.phoneNumber || null;
  let sentvia = req.body.sentvia || null;

  // Validate

  if (!invitationid) {
    return res.status(400).send({
      msg: "invitationid is required",
      msgType: "error",
    });
  }

  if (sentvia === "sms") {
    if (!phoneNumber) {
      if (email) {
        sentvia = "email";
      }
    }
  }

  if (!name || name.length === 0) {
    return res.status(400).send({
      msg: "name is required",
      msgType: "error",
    });
  }

  if (!["sms", "email", "qrcode", "whatsapp"].includes(sentvia)) {
    return res.status(400).send({
      msg: "sentvia is invalid",
      msgType: "error",
    });
  }

  const sql = `
    UPDATE
      invitations
    SET
      recipientname = ?,
      recipientsms = ?,
      recipientemail = ?,
      sharedvia = ?
    WHERE
      invitationid = ?
    AND
      userid = ?
    ;
  `;

  db.query(
    sql,
    [name, phoneNumber, email, sentvia, invitationid, req.user.userid],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(400).send({
          msg: "unable to update invite",
          msgType: "error",
        });
      }

      return res.status(200).send({
        msg: "invite updated",
        msgType: "success",
      });
    }
  );
};
