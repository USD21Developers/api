exports.POST = (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["user", "sysadmin"];
  if (!allowedUsertypes.includes(usertype)) {
    console.log(`User (userid ${req.user.userid}) is not authorized.`);
    return res.status(401).send({
      msg: "user is not authorized for this action",
      msgType: "error",
    });
  }
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-test")
    : require("../../database");

  const sql = `
    SELECT
      username,
      fullname,
      firstname,
      lastname,
      email,
      country
    FROM
      users
    WHERE
      userid = ?
    ;
  `;

  db.query(sql, [req.user.userid], (err, result) => {
    if (err) {
      console.log(err);
      return res
        .status(500)
        .send({ msg: "unable to query for user", msgType: "error" });
    }

    if (!result.length)
      return res.status(404).send({ msg: "user not found", msgType: "error" });

    const {
      username = "",
      fullname = "",
      firstname = "",
      lastname = "",
      email = "",
      country = "",
    } = result[0];

    const data = {
      username,
      fullname,
      firstname,
      lastname,
      email,
      country,
    };

    return res
      .status(200)
      .send({ msg: "profile retrieved", msgType: "success", data: data });
  });
};
