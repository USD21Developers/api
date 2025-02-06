exports.POST = async (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["sysadmin"];
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
  const fromDateTime = req.body.fromDateTime || null;
  const toDateTime = req.body.toDateTime || null;

  // Validate
  const moment = require("moment");
  const momentFrom = moment(req.body.fromDateTime);
  const momentTo = moment(req.body.toDateTime);

  const isValidFrom = momentFrom.isValid();
  const isValidTo = momentTo.isValid();

  if (!isValidFrom) {
    return res.status(400).send({
      msg: "invalid from datetime",
      msgType: "error",
    });
  }

  if (!isValidTo) {
    return res.status(400).send({
      msg: "invalid to datetime",
      msgType: "error",
    });
  }

  if (!(momentFrom < momentTo)) {
    return res.status(400).send({
      msg: "fromDateTime must come before toDateTime",
      msgType: "error",
    });
  }

  const churchid = req.user.churchid;

  // Retrieve data
  const sql = `
    SELECT
      i.invitationid,
      i.isDeleted,
      i.eventid,
      i.userid,
      i.recipientid,
      i.recipientname,
      i.sharedvia,
      i.lang,
      i.followup,
      i.invitedAt,
      e.title AS eventTitle,
      e.type AS eventType,
      e.isDeleted AS eventIsDeleted,
      u.firstname AS userFirstName,
      u.lastname AS userLastName,
      u.profilephoto AS userPhoto,
      u.usertype AS userType,
      u.gender AS userGender
    FROM
      invitations i
    INNER JOIN events e ON i.eventid = e.eventid
    INNER JOIN users u ON i.userid = u.userid
    WHERE
      e.churchid = ?
    AND
      u.userstatus = 'registered'
    AND
      i.invitedAt >= STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s')
    AND
      i.invitedAt <= STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s')
    ORDER BY
      i.invitedAt DESC
    ;
  `;

  db.query(sql, [churchid, fromDateTime, toDateTime], (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).send({
        msg: "unable to query as admin for activity",
        msgType: "error",
      });
    }

    const activity = result.length ? result : [];

    return res.status(200).send({
      msg: "activity retrieved",
      msgType: "success",
      activity: activity,
    });
  });
};
