exports.GET = async (req, res) => {
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

  let userid = req.params["userid"] || "";

  if (userid === "") {
    return res.status(400).send({
      msg: "invalid user id",
      msgType: "error",
    });
  }

  userid = Math.abs(parseInt(req.params["userid"]));

  const sql = `
    SELECT
      COUNT(*) AS following
    FROM
      follow
    WHERE
      follower = ?
    AND
      followed <> ?
    LIMIT 1
    ;
  `;

  db.query(sql, [userid, userid], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(400).send({
        msg: "unable to retrieve quantity of users currently following",
        msgType: "error",
      });
    }

    const quantity = result[0].following;

    return res.status(200).send({
      msg: "retrieved quantity of users following",
      msgType: "success",
      quantity: quantity,
    });
  });
};
