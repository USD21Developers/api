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

  // Get request params
  const churchids = req.body.churchids || []; // Empty array means all churches
  const maxQuantity = req.body.maxQuantity || 25;

  // Validate

  if (!churchids) {
    return res.status(400).send({
      msg: "churchids is required",
      msgType: "error",
    });
  }

  if (!Array.isArray(churchids)) {
    return res.status(400).send({
      msg: "churchids must be an array",
      msgType: "error",
    });
  }

  const churchIdsLength = churchids.length;

  if (churchIdsLength > 1000) {
    return res.status(400).send({
      msg: "quantity of churchids must be 1000 or less",
      msgType: "error",
    });
  }

  let churchIdsAllNumeric = true;
  let allChurches = false;
  for (let i = 0; i < churchIdsLength; i++) {
    const churchid = churchids[i];
    const notNumeric = isNaN(churchid);
    if (notNumeric) {
      churchIdsAllNumeric = false;
      break;
    }
    if (churchid == 0) allChurches = true;
  }
  if (!churchIdsAllNumeric) {
    return res.status(400).send({
      msg: "every value of churchids must be numeric",
      msgType: "error",
    });
  }

  if (!maxQuantity) {
    return res.status(400).send({
      msg: "maxQuantity is required",
      msgType: "error",
    });
  }

  if (isNaN(maxQuantity)) {
    return res.status(400).send({
      msg: "maxQuantity must be numeric",
      msgType: "error",
    });
  }

  if (Math.sign(maxQuantity) !== 1) {
    return res.status(400).send({
      msg: "maxQuantity must be positive",
      msgType: "error",
    });
  }

  if (maxQuantity > 1000) {
    return res.status(400).send({
      msg: "maxQuantity must not exceed 1000",
      msgType: "error",
    });
  }

  let sql = `
    SELECT
      i.invitationid,
      u.userid,
      u.churchid,
      e.type AS eventtype,
      u.firstname,
      u.lastname,
      u.gender,
      i.createdAt,
      u.profilephoto
    FROM
      invitations i
    INNER JOIN events e ON i.eventid = e.eventid
    INNER JOIN users u ON i.userid = u.userid
    WHERE
      u.userstatus = 'registered'
    AND
      i.isDeleted <> 1
    AND
      u.churchid IN ?
    ORDER BY
      i.createdAt DESC
    LIMIT ?
    ;
  `;
  let sqlParams = [[churchids], maxQuantity];

  if (allChurches) {
    sql = `
      SELECT
        i.invitationid,
        u.userid,
        u.churchid,
        e.type AS eventtype,
        u.firstname,
        u.lastname,
        u.gender,
        i.createdAt,
        u.profilephoto
      FROM
        invitations i
      INNER JOIN events e ON i.eventid = e.eventid
      INNER JOIN users u ON i.userid = u.userid
      WHERE
        u.userstatus = 'registered'
      AND
        i.isDeleted <> 1
      ORDER BY
        i.createdAt DESC
      LIMIT ?
      ;
    `;
    sqlParams = [maxQuantity];
  }

  db.query(sql, sqlParams, (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).send({
        msg: "unable to query for latest invites",
        msgType: "error",
      });
    }

    return res.status(200).send({
      msg: "latest invites retrieved",
      msgType: "success",
      invites: result,
    });
  });
};
