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

  // Params
  const acceptedOath = req.body.acceptedOath || null;
  const registrantUserId = req.body.registrantUserId || null;
  const highestLeadershipRole = req.body.highestLeadershipRole || null; // [ "HCL and up", "BTL", "neither" ]

  // TODO:  validate form

  if (!acceptedOath) {
    return res.status(400).send({
      msg: "oath is required",
      msgType: "error",
    });
  }

  if (!registrantUserId) {
    return res.status(400).send({
      msg: "registrantUserId is required",
      msgType: "error",
    });
  }

  if (isNaN(registrantUserId)) {
    return res.status(400).send({
      msg: "registrantUserId must be a number",
      msgType: "error",
    });
  }

  if (req.user.canAuthorize !== 1) {
    return res.status(400).send({
      msg: "approving user lacks permission to authorize",
      msgType: "error",
    });
  }

  if (req.user.canAuthToAuth === 1) {
    if (!highestLeadershipRole) {
      return res.status(400).send({
        msg: "highest leadership role is required",
        msgType: "error",
      });
    }
  }

  const sql = `
    SELECT
      userid AS registrantUserId,
      churchid,
      isAuthorized,
      canAuthorize,
      canAuthToAuth,
      authorizedby,
      userstatus
    FROM
      users
    WHERE
      userid = ?
    LIMIT 1
    ;
  `;

  db.query(sql, [registrantUserId], (error, result) => {
    if (error) {
      return res.status(500).send({
        msg: "unable to query for new user",
        msgType: "error",
      });
    }

    if (!result.length) {
      return res.status(400).send({
        msg: "new user not found",
        msgType: "error",
      });
    }

    const {
      registrantUserId,
      churchid,
      isAuthorized,
      canAuthorize,
      canAuthToAuth,
      authorizedby,
      userstatus,
    } = result[0];

    if (userstatus !== "registered") {
      return res.status(400).send({
        msg: "invalid user status of new user",
        msgType: "error",
      });
    }

    if (isAuthorized === 1) {
      return res.status(200).send({
        msg: "user already authorized",
        msgType: "success",
      });
    }

    if (req.user.canAuthToAuth !== 1) {
      if (req.user.churchid !== churchid) {
        return res.status(400).send({
          msg: "church of approver must match that of new user",
          msgType: "error",
        });
      }
    }

    let newUserCanAuthorize = canAuthorize;
    let newUserCanAuthToAuth = canAuthToAuth;

    if (["HCL and up", "BTL"].includes(highestLeadershipRole)) {
      newUserCanAuthorize = 1;

      if (highestLeadershipRole === "HCL and up") {
        newUserCanAuthToAuth = 1;
      }
    }

    const sql = `
      UPDATE
        users
      SET
        isAuthorized = 1,
        canAuthorize = ?,
        canAuthToAuth = ?,
        authorizedby = ?
      WHERE
        userid = ?
      ;
    `;

    db.query(
      sql,
      [
        newUserCanAuthorize,
        newUserCanAuthToAuth,
        req.user.userid,
        registrantUserId,
      ],
      (error, result) => {
        if (error) {
          console.log(error);
          return res.status(500).send({
            msg: "unable to authorize new user",
            msgType: "error",
          });
        }

        return res.status(200).send({
          msg: "new user authorized",
          msgType: "success",
        });
      }
    );
  });
};
