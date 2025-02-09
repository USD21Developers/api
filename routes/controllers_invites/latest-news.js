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

  // Parameters
  const sinceDate = req.body.sinceDate || null;

  // Validation
  if (!sinceDate) {
    return res.status(400).send({
      msg: "sinceDate parameter is required",
      msgType: "error",
    });
  }

  function epochToMySQLDateTime(epochMs) {
    if (typeof epochMs !== "number" || isNaN(epochMs)) {
      throw new Error("Invalid epoch time");
    }

    return new Date(epochMs).toISOString().slice(0, 19).replace("T", " ");
  }

  const getUser = async (db, userid) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          userid,
          churchid,
          firstname,
          lastname,
          gender,
          profilephoto,
          country,
          lang,
          createdAt
        FROM
          users
        WHERE
          userid = ?
        AND
          userstatus = 'registered'
        LIMIT 1
        ;
      `;

      db.query(sql, [userid], (error, result) => {
        if (error) {
          console.log(error);
          return reject(error);
        }

        if (!result.length) {
          return reject(new Error("user not found"));
        }

        return resolve(result[0]);
      });
    });
  };

  const getRegistrations = async (db, churchid, sinceDate) => {
    return new Promise((resolve, reject) => {
      const sinceDateSQL = epochToMySQLDateTime(sinceDate);
      const sql = `
        SELECT
          userid,
          churchid,
          firstname,
          lastname,
          gender,
          country,
          lang,
          createdAt
        FROM
          users
        WHERE
          userstatus = 'registered'
        AND
          churchid = ?
        AND
          createdAt > ?
        ORDER BY
          createdAt DESC
        ;
      `;

      db.query(sql, [churchid, sinceDate], (error, result) => {
        if (error) {
          console.log(error);
          return reject(error);
        }

        const sinceDateSQL = epochToMySQLDateTime(sinceDate);

        db.query(sql, [churchid, sinceDateSQL], (error, result) => {
          if (error) {
            console.log(error);
            return reject(error);
          }

          const registrations = result;

          return resolve(registrations);
        });
      });
    });
  };

  const getInvitations = async (db, churchid, sinceDate) => {
    const sinceDateSQL = epochToMySQLDateTime(sinceDate);
    const sql = `
      SELECT
        i.invitationid,
        i.eventid,
        i.sharedvia,
        i.lang,
        i.invitedAt,
        e.type AS eventType,
        e.isDeleted AS eventIsDeleted,
        e.country AS eventCountry,
        e.lang AS eventLang,
        e.frequency AS eventFrequency
      FROM
        invitations i
      INNER JOIN events e ON i.eventid = e.eventid
      WHERE
        i.isDeleted = 0
      AND
        e.churchid = ?
      AND
        i.invitedAt > ?
      ORDER BY
        i.invitedAt DESC
      ;
    `;

    db.query(sql, [churchid, sinceDateSQL], (error, result) => {
      if (error) {
        console.log(error);
        return reject(error);
      }

      const invitations = result;

      return resolve(invitations);
    });
  };

  // Main logic begins

  const user = await getUser(db, req.user.userid);

  if (!user) {
    return res.status(400).send({
      msg: "unable to query for user",
      msgType: "error",
    });
  }

  const registrations = await getRegistrations(db, user.churchid, sinceDate);
  const invitations = await getInvitations(db, user.churchid, sinceDate);

  if (!registrations) {
    return res.status(400).send({
      msg: "unable to query for registrations",
      msgType: "error",
    });
  }

  if (!invitations) {
    return res.status(400).send({
      msg: "unable to query for invitations",
      msgType: "error",
    });
  }

  return res.status(200).send({
    msg: "latest news retrieved",
    msgType: "success",
    registrations: registrations,
    invitations: invitations,
  });
};
