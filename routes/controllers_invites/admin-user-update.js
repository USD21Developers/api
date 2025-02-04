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

  let churchEmailUnverified = 0;

  // Params
  const userid = req.body.userid || null;
  const churchid = req.body.churchid || null;
  const country = req.body.country || null;
  const lang = req.body.lang || null;
  const firstname = req.body.firstname || null;
  const lastname = req.body.lastname || null;
  const email = req.body.email || null;
  let usertypeNew = req.body.usertype || null;
  let userstatus = req.body.userstatus || null;
  let canAuthorize = req.body.canAuthorize || 0;
  let canAuthToAuth = req.body.canAuthToAuth || 0;

  const getUser = (db, userid) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          userid,
          churchid,
          isAuthorized,
          canAuthorize,
          canAuthToAuth,
          firstname,
          lastname,
          churchEmailUnverified,
          usertype,
          userstatus,
          lang,
          country,
          DATE_FORMAT(createdAt, '%Y-%m-%dT%H:%i:%s') AS createdAt
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
          return reject(new Error("user not found"));
        }

        const user = result[0];

        return resolve(user);
      });
    });
  };

  const getSysadminMe = (db, userid) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          userid,
          churchid,
          isAuthorized,
          canAuthorize,
          canAuthToAuth,
          firstname,
          lastname,
          churchEmailUnverified,
          usertype,
          userstatus,
          lang,
          country,
          DATE_FORMAT(createdAt, '%Y-%m-%dT%H:%i:%s') AS createdAt,
          DATE_FORMAT(updatedAt, '%Y-%m-%dT%H:%i:%s') AS updatedAt
        FROM
          users
        WHERE
          userid = ?
        AND
          usertype = 'sysadmin'
        LIMIT 1
        ;
      `;

      db.query(sql, [userid], (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result.length) {
          return reject(new Error("sysadmin not found"));
        }

        const sysadmin = result[0];

        return resolve(sysadmin);
      });
    });
  };

  const isSuperUserMe = await require("./utils").isSuperUser(
    db,
    req.user.userid
  );
  const sysAdminMe = getSysadminMe(db, req.user.userid);

  const user = await getUser(db, userid);
  const isSuperUser = await require("./utils").isSuperUser(db, userid);

  const newlog = {
    user: {
      before: user,
      after: user,
    },
    sysadmin: sysAdminMe,
  };

  churchEmailUnverified = user.churchEmailUnverified;

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
          userid <> ?
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
          usertype = ?,
          churchEmailUnverified = ?
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
          usertypeNew,
          churchEmailUnverified,
          userid,
        ],
        (error, result) => {
          if (error) {
            return reject(error);
          }

          newlog.user.after.churchid = churchid;
          newlog.user.after.country = country;
          newlog.user.after.lang = lang;
          newlog.user.after.firstname = firstname.trim();
          newlog.user.after.lastname = lastname.trim();
          newlog.user.after.email = email.trim().toLowerCase();
          newlog.user.after.usertype = usertype;
          newlog.churchEmailUnverified = churchEmailUnverified;

          return resolve();
        }
      );
    });
  };

  const logChange = (db, newlog) => {
    return new Promise(async (resolve, reject) => {
      const userid = newlog.user.after.userid;
      const changed_by = JSON.stringify(newlog.sysadmin);
      const changed_by_userid = newlog.sysadmin.userid;
      const user_before = JSON.stringify(newlog.user.before);
      const user_after = JSON.stringify(newlog.user.after);
      const hash_after = await require("./utils").hashStringAsync(user_after);

      const sql = `
        INSERT INTO logs_adminchanges(
          userid,
          changed_by,
          changed_by_userid,
          user_before,
          user_after,
          hash_after,
          createdAt
        ) VALUES (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          UTC_TIMESTAMP
        )
      `;

      db.query(
        sql,
        [
          userid,
          changed_by,
          changed_by_userid,
          user_before,
          user_after,
          hash_after,
        ],
        (error, result) => {
          if (error) {
            return reject(error);
          }

          return resolve("user updated");
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

  /*******************************
   *  BEGIN SUPER USERS SECTION  *
   *******************************/
  if (isSuperUserMe) {
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

    const isEmailAlreadyInUse = await checkIfEmailAlreadyInUse(
      db,
      email,
      userid
    );

    if (isEmailAlreadyInUse) {
      return res.status(400).send({
        msg: "email is already in use",
        msgType: "error",
      });
    }

    // If super user is editing their own record
    if (req.user.userid === userid) {
      // Super user can't downgrade his own usertype
      if (user.usertype === "sysadmin" && usertypeNew !== "sysadmin") {
        usertypeNew = "sysadmin";
      }

      // Super user can't freeze himself
      if (user.userstatus !== "frozen" && userstatus === "frozen") {
        userstatus = user.userstatus;
      }

      // Super user can't set canAuthorize to false
      if (Number(canAuthorize) !== 1) {
        canAuthorize = 1;
      }

      // Super user can't set canAuthToAuth to false
      if (Number(canAuthToAuth) !== 1) {
        canAuthToAuth = 1;
      }

      const isPrivilegedEmailAccount =
        require("./utils").isPrivilegedEmailAccount;
      const currentEmailIsPrivileged = isPrivilegedEmailAccount(user.email);
      const newEmailIsPrivileged = isPrivilegedEmailAccount(email);

      // Super user can't just claim to have a USD21 e-mail address (relevant in case "super user" status is later revoked)
      if (newEmailIsPrivileged && !currentEmailIsPrivileged) {
        churchEmailUnverified = 1;
      }
    }

    await updateAsSuperUser(db);
  }
  /*****************************
   *  END SUPER USERS SECTION  *
   *****************************/

  // If admin is editing his own record
  if (user.userid === req.user.userid) {
    if (user.usertype === "sysadmin" && usertypeNew !== "sysadmin") {
      return res.status(400).send({
        msg: "sysadmins cannot downgrade their own usertype",
        msgType: "error",
      });
    }

    if (user.usertype === "sysadmin") {
      if (user.userstatus !== "frozen" && userstatus === "frozen") {
        return res.status(400).send({
          msg: "sysadmins cannot downgrade their own userstatus",
          msgType: "error",
        });
      }

      if (user.canAuthorize === 1 && canAuthorize !== 1) {
        return res.status(400).send({
          msg: "sysadmins cannot downgrade their own canAuthorize setting",
          msgType: "error",
        });
      }

      if (user.canAuthToAuth === 1 && canAuthToAuth !== 1) {
        return res.status(400).send({
          msg: "sysadmins cannot downgrade their own canAuthToAuth setting",
          msgType: "error",
        });
      }
    }
  }

  // Admins that are not super users cannot edit users from other congregations
  if (!isSuperUserMe) {
    if (sysAdminMe.churchid !== user.churchid) {
      return res.status(400).send({
        msg: "insufficient permissions to modify a user from another congregation",
        msgType: "error",
      });
    }
  }

  const sql = `
    UPDATE
      users
    SET
      churchid = ?,
      userstatus = ?,
      canAuthorize = ?,
      canAuthToAuth = ?
    WHERE
      userid = ?
    ;
  `;

  db.query(
    sql,
    [churchid, userstatus, canAuthorize, canAuthToAuth, userid],
    async (error, result) => {
      if (error) {
        console.log(error);
        return res.status(500).send({
          msg: "unable to update user",
          msgType: "error",
        });
      }

      newlog.user.after.churchid = churchid;
      newlog.user.after.userstatus = userstatus;
      newlog.user.after.canAuthorize = canAuthorize;
      newlog.user.after.canAuthToAuth = canAuthToAuth;

      logChange(db, newlog);

      return res.status(200).send({
        msg: "user updated",
        msgType: "success",
      });
    }
  );
};
