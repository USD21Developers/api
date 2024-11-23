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

  // Enforce required church role
  if (req.user.canAuthToAuth === 0) {
    return res.status(401).send({
      msg: "user is not authorized for this action",
      msgType: "error",
    });
  }

  // Params
  const userid = req.body.userid;

  // Validation
  if (!userid) {
    return res.status(400).send({
      msg: "userid is required",
      msgType: "error",
    });
  }
  if (isNaN(userid)) {
    return res.status(400).send({
      msg: "userid must be a number",
      msgType: "error",
    });
  }
  if (userid < 1) {
    return res.status(400).send({
      msg: "userid must be a positive integer",
      msgType: "error",
    });
  }

  const getRequesterEmail = (db, userid) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          email
        FROM
          users
        WHERE
          userid = ?
        LIMIT 1
        ;
      `;

      db.query(sql, [userid], (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result.length) {
          return reject("no records found");
        }

        const email = result[0].email;

        return resolve(email);
      });
    });
  };

  const getUser = (db, userid) => {
    return new Promise((resolve, reject) => {
      // Query
      const sql = `
        SELECT
          userid,
          churchid,
          username,
          isAuthorized,
          canAuthorize,
          canAuthToAuth,
          authorizedby,
          firstname,
          lastname,
          email,
          churchEmailUnverified,
          gender,
          usertype,
          userstatus,
          profilephoto,
          lang,
          country,
          createdAt
        FROM
          users
        WHERE
          userid = ?
        LIMIT 1
        ;
      `;

      db.query(sql, [userid], (error, result) => {
        if (error) {
          console.log(error);
          return reject(error);
        }

        const user = result.length ? result[0] : null;

        return resolve(user);
      });
    });
  };

  const getAuthorizedBy = (db, userid) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          userid,
          firstname,
          lastname,
          churchid
        FROM
          users
        WHERE
          userid = ?
        LIMIT 1
        ;
      `;

      db.query(sql, [userid], (error, result) => {
        if (error) {
          return reject(error);
        }

        const authorizedUser = result.length ? result : null;

        return resolve(authorizedUser);
      });
    });
  };

  const requesterIsSuperUser = await require("./utils").isSuperUser(
    db,
    req.user.userid
  );

  const user = await getUser(db, userid);

  user.authorizedby = isNaN(user.authorizedby)
    ? null
    : await getAuthorizedBy(db, user.authorizedby);

  return res.status(200).send({
    msg: "user retrieved",
    msgType: "success",
    user: user,
    editable: requesterIsSuperUser,
  });
};
