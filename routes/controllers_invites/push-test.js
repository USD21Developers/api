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

    sendWebPush(db, req.user.userid, "Test", "This is a test push message", {
      jason: "is cool",
    })
      .then((result) => {
        // console.log(result);
      })
      .catch((error) => {
        console.log(error);
      });
  });
};
