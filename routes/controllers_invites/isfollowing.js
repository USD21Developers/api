exports.POST = async (req, res) => {
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

  // Param
  let userids = req.body.userids || [];

  // Validate

  if (!Array.isArray(userids)) {
    return res.status(400).send({
      msg: "userids must be an array",
      msgType: "error",
      userids: userids,
    });
  }

  let isAllUsers = true;
  const allUsersLength = userids.length;
  for (let i = 0; i < allUsersLength; i++) {
    if (typeof users[i] !== "number") {
      isAllUsers = false;
      break;
    }
  }
  if (!isAllUsers) {
    return res.status(400).send({
      msg: "userids must all be integers",
      msgType: "error",
      userids: userids,
    });
  }

  // Query

  const sql = `
    SELECT
        followed
    FROM
        follow
    WHERE
        follower = ?
    AND
        followed IN ?
    ;
  `;

  db.query(sql, [req.user.userid, userids], (err, results) => {
    if (err) {
      return res.status(500).send({
        msg: "unable to check follow status of user IDs",
        msgType: "error",
        userids: userids,
      });
    }

    if (!results.length) {
      return res.status(400).send({
        msg: "user IDs not found",
        msgType: "error",
        userids: userids,
      });
    }

    const result = [];
    userids.forEach((item) => {
      const isFollowing =
        userids.find((i) => i === item) === item ? true : false;

      result.push({
        userid: item,
        isFollowing: isFollowing,
      });
    });

    return res.status(200).send({
      msg: "following status of user IDs retrieved",
      msgType: "success",
      result: result,
    });
  });
};
