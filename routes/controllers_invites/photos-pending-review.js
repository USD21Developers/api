exports.POST = (req, res) => {
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
      canAuthorize,
      canAuthToAuth,
      churchid
    FROM
      users
    WHERE
      userid = ?
    ;
  `;

  db.query(sql, [req.user.userid], (error, result) => {
    if (error) {
      return res.status(500).send({
        msg: "unable to retrieve user",
        msgType: "error",
      });
    }

    if (!result.length) {
      return res.status(404).send({
        msg: "user not found",
        msgType: "error",
      });
    }

    const { canAuthorize, canAuthToAuth, churchid } = result[0];

    if (canAuthorize === 0 && canAuthToAuth === 0) {
      return res.status(401).send({
        msg: "user not authorized to review photos",
        msgType: "error",
      });
    }

    let sql = `
      SELECT
        u.userid,
        u.profilephoto,
        u.firstname,
        u.lastname,
        u.gender,
        u.usertype,
        u.userstatus,
        u.createdAt,
        u.updatedAt,
        pr.createdAt AS photoAddedAt,
        pr.updatedAt AS photoUpdatedAt
      FROM
        users u
      INNER JOIN photoreview pr ON u.userid = pr.userid
      WHERE
        u.churchid = ?
      AND
        u.isAuthorized = 1
      AND
        u.userstatus = 'registered'
      ORDER BY
        pr.createdAt DESC
      LIMIT 1
      ;
    `;

    let sqlParams = [churchid];

    db.query(sql, sqlParams, (error, result) => {
      if (error) {
        return res.status(500).send({
          msg: "unable to retrieve photos to review",
          msgType: "error",
        });
      }

      const photos = result;

      return res.status(200).send({
        msg: "photos pending review retrieved",
        msgType: "success",
        photos: photos,
      });
    });
  });
};
