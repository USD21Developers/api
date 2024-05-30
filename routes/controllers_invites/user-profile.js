exports.GET = async (req, res) => {
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

  // Params
  const userid = req.params["userid"] || "";

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
  let sql = `
    SELECT
        userid,
        churchid,
        username,
        firstname,
        lastname,
        gender,
        usertype,
        userstatus,
        profilephoto,
        lang,
        country,
        createdAt,
        (SELECT COUNT(*) FROM follow WHERE follower = ?) AS numFollowing,
        (SELECT COUNT(*) FROM follow WHERE followed = ?) AS numFollowedBy,
        (SELECT 1 FROM follow WHERE follower = ? AND followed = ? LIMIT 1) AS followed,
        (
          SELECT COUNT(*) FROM events
          WHERE createdBy = ?
          AND isDeleted = 0
          AND sharewithfollowers = 'yes'
          AND
            (
              frequency != 'once'
              OR
              (
                frequency = 'once'
                AND
                startdate >= CURDATE()
              )
              OR
              multidayenddate >= CURDATE()
            )
          LIMIT 1
        ) AS numEventsSharing,
        (SELECT COUNT(*) FROM invitations WHERE userid = ? LIMIT 1) AS numInvitesSent
    FROM
        users
    WHERE
        userid = ?
    LIMIT 1
    ;
  `;

  let placeholders = [
    userid,
    userid,
    req.user.userid,
    userid,
    userid,
    userid,
    userid,
  ];

  if (userid === req.user.userid) {
    sql = sql.replaceAll("sharewithfollowers = 'yes'", "createdBy = ?");
    placeholders = [
      req.user.userid,
      req.user.userid,
      req.user.userid,
      req.user.userid,
      req.user.userid,
      req.user.userid,
      req.user.userid,
      req.user.userid,
    ];
  }

  db.query(sql, placeholders, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({
        msg: "unable to query for userid",
        msgType: "error",
      });
    }

    if (!result.length) {
      return res.status(404).send({
        msg: "userid not found",
        msgType: "error",
      });
    }

    if (result[0].userstatus !== "registered") {
      return res.status(400).send({
        msg: "user status must be registered",
        msgType: "error",
      });
    }

    let profile = result[0];

    profile.followed = profile.followed === 1 ? true : false;

    res.status(200).send({
      msg: "user profile retrieved",
      msgType: "success",
      profile: profile,
    });
  });
};
