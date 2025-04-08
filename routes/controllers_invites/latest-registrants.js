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

  if (!churchIdsLength) {
    return res.status(400).send({
      msg: "quantity of churchids must be at least 1",
      msgType: "error",
    });
  }

  if (churchIdsLength > 1000) {
    return res.status(400).send({
      msg: "quantity of churchids must be 1000 or less",
      msgType: "error",
    });
  }

  let churchIdsAllNumeric = true;
  let churchIdsAllPositive = true;
  for (let i = 0; i < churchIdsLength; i++) {
    const churchid = churchids[i];
    const notNumeric = isNaN(churchid);
    let notPositive = Math.sign(churchid) !== 1 ? true : false;
    if (notNumeric) {
      churchIdsAllNumeric = false;
      break;
    }
    if (notPositive) {
      churchIdsAllPositive = false;
      break;
    }
  }
  if (!churchIdsAllNumeric) {
    return res.status(400).send({
      msg: "every value of churchids must be numeric",
      msgType: "error",
    });
  }
  if (!churchIdsAllPositive) {
    return res.status(400).send({
      msg: "every value of churchids must be positive",
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
      userid,
      churchid,
      firstName,
      lastName,
      gender,
      createdAt,
      profilePhoto
    FROM
      users
    WHERE
      userstatus = 'registered'
    AND
      churchid IN ?
    ORDER BY
      createdAt DESC
    LIMIT
      ?
    ;
  `;

  db.query(sql, [[churchids], maxQuantity], (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).send({
        msg: "unable to query for latest registrants",
        msgType: "error",
      });
    }

    return res.status(200).send({
      msg: "latest registrants retrieved",
      msgType: "success",
      registrants: result,
    });
  });
};
