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

  // Query for userid
  const sql = `
    SELECT
        userstatus
    FROM
        users
    WHERE
        userid = ?
    LIMIT 1
    ;
  `;
  db.query(sql, [userid], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).send({
        msg: "unable to query for userid",
        msgType: "error",
      });
    }

    if (!results.length) {
      return res.status(404).send({
        msg: "userid not found",
        msgType: "error",
      });
    }

    if (results[0].userstatus !== "registered") {
      return res.status(400).send({
        msg: "user status must be registered",
        msgType: "error",
      });
    }

    // Clear existing follows to prevent duplicates
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
          msg: "unable to delete duplicate records in order to follow user",
          msgType: "error",
        });
      }

      // Follow user
      const sql = `
            INSERT INTO follow(
                follower,
                followed,
                createdAt
            ) VALUES(
                ?,
                ?,
                UTC_TIMESTAMP()
            );
        `;
      db.query(sql, [req.user.userid, userid], (err, results) => {
        if (err) {
          console.log(err);
          return res.status(500).send({
            msg: "unable to follow user",
            msgType: "error",
          });
        }

        return res.status(200).send({
          msg: "follow successful",
          msgType: "success",
          followedid: userid,
        });
      });
    });
  });
};
