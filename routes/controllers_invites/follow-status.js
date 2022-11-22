exports.POST = (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["sysadmin", "user"];
  let isAuthorized = false;
  if (allowedUsertypes.includes(usertype)) isAuthorized = true;
  if (req.user.may_create_coupons) isAuthorized = true;
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

  const useridsToCheck = req.body.userids;

  if (!Array.isArray(useridsToCheck)) {
    return res.status(400).send({
      msg: "parameter userids is required and must be an array",
      msgType: "error",
    });
  }

  const sql = `
    SELECT
      followed
    FROM
      follow
    WHERE
      follower = ?
    AND
      followed IN (?)
    ;
  `;

  db.query(sql, [req.user.userid, useridsToCheck], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).send({
        msg: "unable to check for follow status",
        msgType: "error",
        err: err,
      });
    }

    let returnObject;

    if (results.length) {
      returnObject = useridsToCheck.map((userid) => {
        const isFollowing = results.find((item) => item.followed === userid)
          ? true
          : false;
        return {
          userid: userid,
          isFollowing: isFollowing,
        };
      });
    } else {
      returnObject = useridsToCheck.map((userid) => {
        return {
          userid: userid,
          isFollowing: false,
        };
      });
    }

    res.status(200).send({
      msg: "follow status info retrieved",
      msgType: "success",
      followStatus: returnObject,
    });
  });
};
