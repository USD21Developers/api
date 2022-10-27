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

  // Params
  const userid = req.body.userid || "";

  // Validate

  if (userid === "") {
    return res.status(400).send({
      msg: "userid is required",
      msgType: "error",
    });
  }

  if (typeof parseInt(userid) !== "number") {
    return res.status(400).send({
      msg: "userid must be numeric",
      msgType: "error",
    });
  }

  if (parseInt(userid) < 0) {
    return res.status(400).send({
      msg: "userid must be greater than zero",
      msgType: "error",
    });
  }

  const sql = `
    DELETE FROM follow
    WHERE follower = ?
    AND followed = ?
    ;
  `;

  db.query(sql, [req.user.userid, userid], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).send({
        msg: "unable to unfollow user",
        msgType: "error",
      });
    }

    return res.status(200).send({
      msg: "unfollow successful",
      msgType: "success",
    });
  });
};
