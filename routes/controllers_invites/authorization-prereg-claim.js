const moment = require("moment");

const getPreAuthData = (db, churchid, authorizedby, authcode) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        p.sentvia,
        p.churchid,
        DATE_FORMAT(CONVERT_TZ(p.expiresAt, '+00:00', '+00:00'), '%Y-%m-%dT%H:%i:%sZ') AS expiry,
        p.firstname AS newUserFirstName,
        p.lastname AS newUserLastName,
        u.firstname AS authorizedByFirstName,
        u.lastname AS authorizedByLastName
      FROM
        preauth p
      INNER JOIN users u ON p.authorizedby = u.userid
      WHERE
        p.churchid = ?
      AND
        p.authorizedby = ?
      AND
        p.authcode = ?
      LIMIT 1
      ;
    `;

    db.query(sql, [churchid, authorizedby, authcode], (err, result) => {
      if (err) {
        return reject(err);
      }

      if (!result.length) {
        return reject(new Error("no records found"));
      }

      const {
        sentvia,
        expiry,
        newUserFirstName,
        newUserLastName,
        authorizedByFirstName,
        authorizedByLastName,
      } = result[0];

      const preAuthData = {
        authorizedBy: {
          firstname: authorizedByFirstName,
          lastname: authorizedByLastName,
          userid: authorizedby,
        },
        expiry: expiry,
        newUser: {
          firstname: newUserFirstName,
          lastname: newUserLastName,
        },
        sentvia: sentvia,
      };

      return resolve(preAuthData);
    });
  });
};

exports.POST = async (req, res) => {
  // Set database
  const isLocal = req.headers.referer.indexOf("localhost") >= 0 ? true : false;
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Parameters
  const churchid = req.body.churchid || null;
  const authorizedBy = req.body.authorizedBy || null;
  const authcode = req.body.authcode || null;
  const now = moment().utc();

  // Validate

  if (!churchid) {
    return res.status(400).send({
      msg: "churchid is required",
      msgType: "error",
    });
  }

  if (!authorizedBy) {
    return res.status(400).send({
      msg: "authorizedBy is required",
      msgType: "error",
    });
  }

  if (!authcode) {
    return res.status(400).send({
      msg: "authcode is required",
      msgType: "error",
    });
  }

  if (isNaN(churchid)) {
    return res.status(400).send({
      msg: "churchid must be a number",
      msgType: "error",
    });
  }

  if (isNaN(authorizedBy)) {
    return res.status(400).send({
      msg: "authorizedBy must be a number",
      msgType: "error",
    });
  }

  if (isNaN(authcode)) {
    return res.status(400).send({
      msg: "authcode must be a number",
      msgType: "error",
    });
  }

  if (authcode <= 0) {
    return res.status(400).send({
      msg: "authcode must be a positive number",
      msgType: "error",
    });
  }

  if (churchid <= 0) {
    return res.status(400).send({
      msg: "churchid must be a positive number",
      msgType: "error",
    });
  }

  if (authorizedBy <= 0) {
    return res.status(400).send({
      msg: "authorizedBy must be a positive number",
      msgType: "error",
    });
  }

  if (authcode.toString().length !== 6) {
    return res.status(400).send({
      msg: "authcode must be exactly 6 characters",
      msgType: "error",
    });
  }

  const preAuthArray = [
    Number(churchid),
    Number(authorizedBy),
    Number(authcode),
  ];

  const preAuthData = await getPreAuthData(
    db,
    Number(churchid),
    Number(authorizedBy),
    Number(authcode)
  );

  return res.status(200).send({
    msg: "authorization verified",
    msgType: "success",
    preAuthArray: preAuthArray,
    preAuthData: preAuthData,
  });
};
