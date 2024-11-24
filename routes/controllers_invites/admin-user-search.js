exports.POST = async (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["sysadmin"];
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

  // Enforce required church role
  if (req.user.canAuthToAuth === 0) {
    return res.status(401).send({
      msg: "user is not authorized for this action",
      msgType: "error",
    });
  }

  // Get parameters
  const churchid = req.body.churchid || null;
  let firstname = req.body.firstname;
  let lastname = req.body.lastname;

  // Validate

  if (isNaN(churchid)) {
    return res.status(400).send({
      msg: "churchid must be a number",
      msgType: "error",
    });
  }

  if (churchid < 0) {
    return res.status(400).send({
      msg: "churchid must be greater than zero",
      msgType: "error",
    });
  }

  if (typeof firstname !== "string") {
    return res.status(400).send({
      msg: "firstname must be a string",
      msgType: "error",
    });
  }

  if (typeof lastname !== "string") {
    return res.status(400).send({
      msg: "lastname must be a string",
      msgType: "error",
    });
  }

  if (!firstname.length && !lastname.length) {
    return res.status(400).send({
      msg: "either firstname or lastname are required",
      msgType: "error",
    });
  }

  if (firstname.length > 255) {
    return res.status(400).send({
      msg: "firstname is too large",
      msgType: "error",
    });
  }

  if (lastname.length > 255) {
    return res.status(400).send({
      msg: "lastname is too large",
      msgType: "error",
    });
  }

  firstname = firstname.trim();
  lastname = lastname.trim();

  // Run query
  let sqlPlaceholders;
  let sql = `
    SELECT
      userid,
      firstname,
      lastname,
      gender,
      usertype,
      userstatus,
      profilephoto,
      createdAt
    FROM
      users
    WHERE
      churchid = ?
    AND
  `;

  if (firstname.length && lastname.length) {
    sql += `
        LOWER(firstname) LIKE LOWER(?)
      AND
        LOWER(lastname) LIKE LOWER(?)
    `;
    sqlPlaceholders = [churchid, `${firstname}%`, `${lastname}%`];
  } else if (firstname.length && !lastname.length) {
    sql += `
      LOWER(firstname) LIKE LOWER(?)
    `;
    sqlPlaceholders = [churchid, `${firstname}%`];
  } else if (!firstname.length && lastname.length) {
    sql += `
      LOWER(lastname) LIKE LOWER(?)
    `;
    sqlPlaceholders = [churchid, `${lastname}%`];
  }

  sql += `
    ORDER BY
      churchid, lastname, firstname
    ;
  `;

  db.query(sql, sqlPlaceholders, (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).send({
        msg: "unable to query for user",
        msgType: "error",
      });
    }

    return res.status(200).send({
      msg: "users within specified congregation queried",
      msgType: "success",
      users: result,
    });
  });
};
