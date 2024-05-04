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
  const oldSubscription = req.body.oldSubscription || null;
  const newSubscription = req.body.newSubscription || null;

  // Validate
  if (!oldSubscription || !newSubscription) {
    const msg =
      "cannot update push subscription: both old and new subscription objects are required arguments";
    console.log(msg);
    return res.status(400).send({
      msg: msg,
      msgType: "error",
    });
  }

  // Hash the old subscription
  const oldSubscriptionUTF8String = Buffer.from(
    JSON.stringify(oldSubscription),
    "utf-8"
  );
  const oldSubscriptionHash = crypto
    .createHash("sha256")
    .update(oldSubscriptionUTF8String)
    .digest("hex");

  // Hash the new subscription
  const newSubscriptionUTF8String = Buffer.from(
    JSON.stringify(newSubscription),
    "utf-8"
  );
  const newSubscriptionHash = crypto
    .createHash("sha256")
    .update(newSubscriptionUTF8String)
    .digest("hex");

  // Update the old subscription (if it exists)

  const newSubscriptionExpirationTime = newSubscription.hasOwnProperty(
    "expirationTime"
  )
    ? newSubscription.expirationTime
    : null;

  const sql = `
    UPDATE
      pushsubscriptions
    SET
      subscription = ?,
      sha256hex = ?,
      expirationTime = ?
    WHERE
      id = (SELECT id FROM pushsubscriptions WHERE userid = ? AND sha256hex = ? LIMIT 1)
    ;
  `;

  db.query(
    sql,
    [
      JSON.stringify(newSubscription),
      newSubscriptionHash,
      newSubscriptionExpirationTime,
      req.user.userid,
      oldSubscriptionHash,
    ],
    (error, result) => {
      if (error) {
        console.log(error);
        return res.status(500).send({
          msg: "could not update push subscription",
          msgType: "error",
        });
      }

      if (result.affectedRows >= 1) {
        return res.status(200).send({
          msg: "push subscription updated",
          msgType: "success",
          affectedRows: result.affectedRows,
        });
      }

      /*
        In case the old subscription no longer exists (and therefore couldn't be updated), 
        just insert the new subscription as a new record 
      */

      if (result.affectedRows === 0) {
        const sql = `
          INSERT INTO pushsubscriptions(
            userid,
            subscription,
            sha256hex,
            expirationTime,
            createdAt
          ) VALUES (
            ?,
            ?,
            ?,
            ?,
            UTC_TIMESTAMP()
          )
        `;

        db.query(
          sql,
          [
            req.user.userid,
            JSON.stringify(newSubscription),
            newSubscriptionHash,
            newSubscriptionExpirationTime,
          ],
          (error, result) => {
            if (error) {
              console.log(error);
              return res.status(500).send({
                msg: "unable to store updated subscription",
                msgType: "error",
              });
            }

            return res.status(200).send({
              msg: "push subscription updated",
              msgType: "success",
              affectedRows: result.affectedRows,
            });
          }
        );
      }
    }
  );
};
