exports.POST = async (req, res) => {
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
  const fetchChurches = require("../controllers_services/churches").FETCH;
  const churches = await fetchChurches();

  if (!Array.isArray(churches)) {
    return res
      .status(500)
      .send({ msg: "unable to retrieve churches", msgType: "error" });
  }

  const firstName = req.body.searchedFirstName || "";
  const lastName = req.body.searchedLastName || "";

  if (typeof firstName !== "string") {
    return res
      .status(400)
      .send({ msg: "first name must be a string", msgType: "error" });
  }

  if (typeof lastName !== "string") {
    return res
      .status(400)
      .send({ msg: "last name must be a string", msgType: "error" });
  }

  if (!firstName.trim().length && !lastName.trim().length) {
    return res
      .status(400)
      .send({ msg: "name must not be blank", msgType: "error" });
  }

  let sql = `
      SELECT
        userid,
        firstname,
        lastname,
        gender,
        profilephoto
      FROM
        users
      WHERE
        userstatus = 'registered'
      AND
        userid <> ?
    `;

  let sqlPlaceholders;

  if (firstName.trim().length && lastName.trim().length) {
    sqlPlaceholders = [
      req.user.userid,
      req.user.churchid,
      `%${firstName}%`,
      `%${lastName}%`,
    ];
    sql += `
        AND
          (
            firstname LIKE ?

            OR

            lastname LIKE ?
          )
        ORDER BY
          lastname,
          firstname
        ;
      `;
  } else if (firstName.trim().length) {
    sqlPlaceholders = [req.user.userid, req.user.churchid, `%${firstName}%`];
    sql += `
        AND
          firstname LIKE ?
        ORDER BY
          lastname,
          firstname
        ;
      `;
  } else if (lastName.trim().length) {
    sqlPlaceholders = [req.user.userid, req.user.churchid, `%${lastName}%`];
    sql += `
        AND
          lastname LIKE ?
        ORDER BY
          lastname,
          firstname
        ;
      `;
  }

  db.query(sql, sqlPlaceholders, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({
        msg: "unable to query all users",
        msgType: "error",
      });
    }

    return res
      .status(200)
      .send({ msg: "all users queried", msgType: "success", matches: result });
  });
};
