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

  const isSuperUser = await require("./utils").isSuperUser(db, req.user.userid);

  // Params
  const userid = req.body.userid || null;
  const churchid = req.body.churchid || null;
  const country = req.body.country || null;
  const lang = req.body.lang || null;
  const firstname = req.body.firstname || null;
  const lastname = req.body.lastname || null;
  const email = req.body.email || null;
  const usertypeNew = req.body.usertype || null;
  const userstatus = req.body.userstatus || null;
  const canAuthorize = req.body.canAuthorize || 0;
  const canAuthToAuth = req.body.canAuthToAuth || 0;

  const checkIfEmailAlreadyInUse = (db, email, userid) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          userid
        FROM
          users
        WHERE
          email = ?
        AND
          userid !== ?
        LIMIT 1
        ;
      `;

      db.query(sql, [email, userid], (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result.length) {
          return resolve(false);
        } else {
          return resolve(true);
        }
      });
    });
  };

  const updateAsSuperUser = (db) => {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE
          users
        SET
          country = ?,
          lang = ?,
          firstname = ?,
          lastname = ?,
          email = ?,
          usertype = ?
        WHERE
          userid = ?
        ;
      `;

      db.query(
        sql,
        [
          country,
          lang,
          firstname.trim(),
          lastname.trim(),
          email.trim().toLowerCase(),
          usertype,
        ],
        (error, result) => {
          if (error) {
            return reject(error);
          }

          return resolve();
        }
      );
    });
  };

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

  if (!churchid) {
    return res.status(400).send({
      msg: "churchid is required",
      msgType: "error",
    });
  }
  if (isNaN(churchid)) {
    return res.status(400).send({
      msg: "churchid must be a number",
      msgType: "error",
    });
  }
  if (churchid < 1) {
    return res.status(400).send({
      msg: "churchid must be a positive integer",
      msgType: "error",
    });
  }

  if (!userstatus) {
    return res.status(400).send({
      msg: "userstatus is required",
      msgType: "error",
    });
  }
  if (typeof userstatus !== "string") {
    return res.status(400).send({
      msg: "userstatus must be a string",
      msgType: "error",
    });
  }
  if (!["registered", "frozen"].includes(userstatus)) {
    return res.status(400).send({
      msg: "userstatus must either be registered or frozen",
      msgType: "error",
    });
  }

  if (isNaN(canAuthorize)) {
    return res.status(400).send({
      msg: "canAuthorize must be a number, if checked",
      msgType: "error",
    });
  }
  if (canAuthorize !== 0 && canAuthorize !== 1) {
    return res.status(400).send({
      msg: "canAuthorize must either be 0 or 1, if checked",
      msgType: "error",
    });
  }

  if (isNaN(canAuthToAuth)) {
    return res.status(400).send({
      msg: "canAuthToAuth must be a number, if checked",
      msgType: "error",
    });
  }
  if (canAuthToAuth !== 0 && canAuthToAuth !== 1) {
    return res.status(400).send({
      msg: "canAuthToAuth must either be 0 or 1, if checked",
      msgType: "error",
    });
  }

  if (isSuperUser) {
    if (!country) {
      return res.status(400).send({
        msg: "country is required",
        msgType: "error",
      });
    }
    if (typeof country !== "string") {
      return res.status(400).send({
        msg: "country must be a string",
        msgType: "error",
      });
    }
    if (country.length !== 2) {
      return res.status(400).send({
        msg: "country must be exactly 2 characters",
        msgType: "error",
      });
    }

    if (!lang) {
      return res.status(400).send({
        msg: "lang is required",
        msgType: "error",
      });
    }
    if (typeof lang !== "string") {
      return res.status(400).send({
        msg: "lang must be a string",
        msgType: "error",
      });
    }
    if (lang.length !== 2) {
      return res.status(400).send({
        msg: "lang must be exactly 2 characters",
        msgType: "error",
      });
    }

    if (!firstname) {
      return res.status(400).send({
        msg: "firstname is required",
        msgType: "error",
      });
    }
    if (typeof firstname !== "string") {
      return res.status(400).send({
        msg: "firstname must be a string",
        msgType: "error",
      });
    }
    if (!firstname.trim().length) {
      return res.status(400).send({
        msg: "firstname is required",
        msgType: "error",
      });
    }
    if (firstname.length > 255) {
      return res.status(400).send({
        msg: "firstname must not exceed 255 characters",
        msgType: "error",
      });
    }

    if (!lastname) {
      return res.status(400).send({
        msg: "lastname is required",
        msgType: "error",
      });
    }
    if (typeof lastname !== "string") {
      return res.status(400).send({
        msg: "lastname must be a string",
        msgType: "error",
      });
    }
    if (!lastname.trim().length) {
      return res.status(400).send({
        msg: "lastname is required",
        msgType: "error",
      });
    }
    if (lastname.length > 255) {
      return res.status(400).send({
        msg: "lastname must not exceed 255 characters",
        msgType: "error",
      });
    }

    if (!email) {
      return res.status(400).send({
        msg: "email is required",
        msgType: "error",
      });
    }
    if (typeof email !== "string") {
      return res.status(400).send({
        msg: "email must be a string",
        msgType: "error",
      });
    }
    if (!email.trim().length) {
      return res.status(400).send({
        msg: "email is required",
        msgType: "error",
      });
    }
    if (email.length > 255) {
      return res.status(400).send({
        msg: "email must not exceed 255 characters",
        msgType: "error",
      });
    }

    const validator = require("email-validator");
    const isValidEmail = validator.validate(email);

    if (!isValidEmail) {
      return res.status(400).send({
        msg: "email format is invalid",
        msgType: "error",
      });
    }

    if (!usertypeNew) {
      return res.status(400).send({
        msg: "usertype is required",
        msgType: "error",
      });
    }
    if (typeof usertypeNew !== "string") {
      return res.status(400).send({
        msg: "usertype must be a string",
        msgType: "error",
      });
    }
    if (!usertypeNew.trim().length) {
      return res.status(400).send({
        msg: "usertype is required",
        msgType: "error",
      });
    }
    if (!["sysadmin", "user"].includes(usertypeNew)) {
      return res.status(400).send({
        msg: "usertype is invalid",
        msgType: "error",
      });
    }

    const isEmailAlreadyInUse = await checkIfEmailAlreadyInUse(db, email);

    if (isEmailAlreadyInUse) {
      return res.status(400).send({
        msg: "email is already in use",
        msgType: "error",
      });
    }

    // TODO:  superUser must not downgrade their own usertype
    // TODO:  superUser must not set their own userstatus to "frozen"
    // TODO:  superUser must not set "canAuthorize" to 0
    // TODO:  superUser must not set "canAuthToAuth" to 0

    await updateAsSuperUser(db);
  }

  // TODO:  sysadmin must not downgrade their own usertype
  // TODO:  sysadmin must not set their own userstatus to "frozen"
  // TODO:  sysadmin must not set "canAuthorize" to 0
  // TODO:  sysadmin must not set "canAuthToAuth" to 0
  // TODO:  sysadmin must not update a user from another congregation
  // TODO:  set a limit for how frequently a user's churchid can be changed (e.g. not more frequently than 30 days)

  return res.status(200).send({
    msg: "user updated",
    msgType: "success",
  });
};
