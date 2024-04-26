const crypto = require("crypto");

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

  const subscriptionHash = crypto
    .createHash("sha256")
    .update(JSON.stringify(subscriptionObject))
    .digest("hex");

  const expirationTime = subscriptionObject.hasOwnProperty("expirationTime")
    ? subscriptionObject.expirationTime
    : null;

  const sql = `
    SELECT
      *
    FROM
      pushsubscriptions
    WHERE
      userid = ?
    AND
      sha256hex = ?
    LIMIT
      1
    ;
  `;

  db.query(sql, [req.user.userid, subscriptionHash], (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).send({
        msg: "unable to query for duplicate push subscription",
        msgType: "error",
      });
    }

    if (result.length) {
      return res.status(204).send({
        msg: "subscription already exists",
        msgType: "success",
      });
    }

    const sql = `
      INSERT INTO pushsubscriptions (
        userid,
        subscription,
        sha256hex,
        expirationTime,
        createdAt
      ) VALUES (
        ?,
        ?,
        ?,
        UTC_TIMESTAMP()
      );
    `;

    db.query(
      sql,
      [
        req.user.userid,
        JSON.stringify(subscriptionObject),
        subscriptionHash,
        expirationTime,
      ],
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
  });
};
