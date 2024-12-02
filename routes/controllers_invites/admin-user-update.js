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
  let churchEmailUnverified = 0;

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

  const getSysadmin = (db, userid) => {
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
          createdAt,
          updatedAt
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

  const user = await getUser(db, userid);
  const sysadmin = await getSysadmin(db, req.user.userid);

  const changesToLog = {
    user: {
      before: user,
      after: user,
    },
    sysadmin: sysadmin,
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
          usertype,
          churchEmailUnverified,
        ],
        (error, result) => {
          if (error) {
            return reject(error);
          }

          changesToLog.user.after.country = country;
          changesToLog.user.after.lang = lang;
          changesToLog.user.after.firstname = firstname.trim();
          changesToLog.user.after.lastname = lastname.trim();
          changesToLog.user.after.email = email.trim().toLowerCase();
          changesToLog.user.after.usertype = usertype;
          changesToLog.churchEmailUnverified = churchEmailUnverified;

          return resolve();
        }
      );
    });
  };

  const checkIfIdenticalLogExists = (db, userid, user_after_hash) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          logid
        FROM
          logs_adminchanges
        WHERE
          changed_userid = ?
        AND
          user_after_hash = ?
        ORDER BY logid DESC
        LIMIT 1
        ;
      `;

      db.query(sql, [userid, user_after_hash], (error, result) => {
        if (error) {
          return reject(error);
        }

        const identicalLogExists = result.length ? true : false;

        return resolve(identicalLogExists);
      });
    });
  };

  const logChange = (db, changesToLog) => {
    return new Promise(async (resolve, reject) => {
      const changed_userid = changesToLog.user.after.userid;
      const changed_by_userid = changesToLog.sysadmin.userid;
      const user_before = JSON.stringify(changesToLog.user.before);
      const user_after = JSON.stringify(changesToLog.user.after);
      const sysadmin = JSON.stringify(changesToLog.sysadmin);
      const user_after_hash = await require("./utils").hashStringAsync(
        user_after
      );
      const identicalLogExists = await checkIfIdenticalLogExists(
        db,
        userid,
        user_after_hash
      );

      if (identicalLogExists) {
        return resolve("user unchanged");
      }

      const sql = `
        INSERT INTO logs_adminchanges(
          changed_userid,
          changed_by_userid,
          user_before,
          user_after,
          user_after_hash,
          sysadmin,
          createdAt
        ) VALUES (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          UTC_TIMESTAMP()
        )
      `;

      db.query(
        sql,
        [
          changed_userid,
          changed_by_userid,
          user_before,
          user_after,
          user_after_hash,
          sysadmin,
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

    if (isSuperUser) {
      if (usertypeNew !== "sysadmin") {
        return res.status(400).send({
          msg: "insufficient permissions to downgrade usertype for this user",
          msgType: "error",
        });
      }

      if (userstatus === "frozen") {
        return res.status(400).send({
          msg: "insufficient permissions to set userstatus to frozen for this user",
          msgType: "error",
        });
      }

      if (Number(canAuthorize) !== 1) {
        return res.status(400).send({
          msgType:
            "insufficient permissions to downgrade canAuthorize for this user",
          msgType: "error",
        });
      }

      if (Number(canAuthToAuth) !== 1) {
        return res.status(400).send({
          msgType:
            "insufficient permissions to downgrade canAuthToAuth for this user",
          msgType: "error",
        });
      }

      const isPrivilegedEmailAccount =
        require("./utils").isPrivilegedEmailAccount;
      const currentEmailIsPrivileged = isPrivilegedEmailAccount(user.email);
      const newEmailIsPrivileged = isPrivilegedEmailAccount(email);

      if (newEmailIsPrivileged && !currentEmailIsPrivileged) {
        churchEmailUnverified = 1;
      }
    }

    await updateAsSuperUser(db);
  }

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

  if (req.user.usertype === "sysadmin" && !isSuperUser) {
    if (sysadmin.churchid !== user.churchid) {
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

      changesToLog.user.after.churchid = churchid;
      changesToLog.user.after.userstatus = userstatus;
      changesToLog.user.after.canAuthorize = canAuthorize;
      changesToLog.user.after.canAuthToAuth = canAuthToAuth;

      const logResult = await logChange(db, changesToLog);

      return res.status(200).send({
        msg: "user updated",
        msgType: "success",
      });
    }
  );
};
