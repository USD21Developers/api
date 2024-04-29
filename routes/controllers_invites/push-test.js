const sendWebPush = require("./utils").sendWebPush;

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

  const sql = `
    SELECT
      subscription
    FROM
      pushsubscriptions
    WHERE
      userid = ?
    LIMIT
      1
    ;
  `;

  db.query(sql, [req.user.userid], (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).send({
        msg: "unable to query for push subscriptions",
        msgType: "error",
        error: error,
      });
    }

    if (!result.length) {
      return res.status(404).send({
        msg: "no records found for user id",
        msgType: "error",
        userid: req.user.userid,
      });
    }

    const invitationid = isStaging ? 167 : 3;

    const sql = `
      SELECT
        i.recipientname,
        e.title,
        e.type
      FROM
        invitations i
      INNER JOIN events e ON i.eventid = e.eventid
      WHERE
        i.userid = ?
      AND
        i.invitationid = ?
      LIMIT
        1
      ;
    `;

    db.query(sql, [req.user.userid, invitationid], (error, result) => {
      if (error) {
        return res.status(500).send({
          msg: "unable to query for invitation",
          msgType: "error",
        });
      }

      if (!result.length) {
        return res.status(404).send({
          msg: "no record found for this invite",
          msgType: "error",
        });
      }

      const recipientName = result[0].recipientname;
      const eventTitle = result[0].title;
      const eventType = result[0].type;
      let eventName = eventTitle;
      if (eventType === "church") eventName = "church";
      if (eventType === "bible talk") eventName = "Bible Talk";

      const pushTitle = `${recipientName} clicked on your invite to ${eventName}`;
      const pushBody = `Click here to follow up with ${recipientName}`;
      const followUpURL = isStaging
        ? `https://staging.invites.mobi/r/#/${invitationid}`
        : `http://localhost:5555/r/#/${invitationid}`;

      sendWebPush(db, req.user.userid, pushTitle, pushBody, {
        followUpURL: followUpURL,
      })
        .then((result) => {
          return res.status(200).send({
            msg: "test push message sent",
            msgType: "success",
            result: result,
          });
        })
        .catch((error) => {
          console.log(error);
          return res.status(500).send({
            msg: "could not send test push message",
            msgType: "error",
            error: error,
          });
        });
    });
  });
};
