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
  let subscriptionObject = {};

  // Validate

  if (!req.body.subscriptionObject) {
    return res.status(400).send({
      msg: "web push subscription object is required",
      msgType: "error",
    });
  }

  if (!req.body.subscriptionObject.endpoint) {
    return res.status(400).send({
      msg: "endpoint is a required key in web push subscription object",
      msgType: "error",
    });
  }

  if (!req.body.subscriptionObject.keys) {
    return res.status(400).send({
      msg: "keys is a required key in web push subscription object",
      msgType: "error",
    });
  }

  if (!req.body.subscriptionObject.keys.auth) {
    return res.status(400).send({
      msg: "keys.auth is a required key in web push subscription object",
      msgType: "error",
    });
  }

  if (!req.body.subscriptionObject.keys.p256dh) {
    return res.status(400).send({
      msg: "keys.p256dh is a required key in web push subscription object",
      msgType: "error",
    });
  }

  subscriptionObject = req.body.subscriptionObject;

  const sql = `
    INSERT INTO pushsubscriptions (
      userid,
      subscription,
      createdAt
    ) VALUES (
      ?,
      ?,
      UTC_TIMESTAMP()
    );
  `;

  db.query(
    sql,
    [userid, JSON.stringify(subscriptionObject)],
    (error, result) => {
      if (error) {
        console.log(error);
        return res.status(500).send({
          msg: "unable to save web push subscription",
          msgType: "error",
        });
      }

      return res.status(200).send({
        msg: "subscribed to web push",
        msgType: "success",
      });
    }
  );
};
