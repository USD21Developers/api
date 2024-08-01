const jsonwebtoken = require("jsonwebtoken");
const moment = require("moment");

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

  if (typeof churchid !== "number") {
    return res.status(400).send({
      msg: "churchid must be a number",
      msgType: "error",
    });
  }

  if (typeof authorizedBy !== "number") {
    return res.status(400).send({
      msg: "authorizedBy must be a number",
      msgType: "error",
    });
  }

  if (typeof authcode !== "string") {
    return res.status(400).send({
      msg: "authcode must be a string",
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

  if (authcode.length !== 6) {
    return res.status(400).send({
      msg: "authcode must be exactly 6 characters",
      msgType: "error",
    });
  }

  // Check DB

  const sql = `
    SELECT
      p.id,
      p.firstname,
      p.lastname,
      p.sentvia,
      p.churchid,
      p.expiresAt,
      p.createdAt,
      u.firstname AS authorizedByFirstName,
      u.lastname AS authorizedByLastName
    FROM
      preauth p
    INNER JOIN users u ON u.userid = p.authorizedby
    WHERE
      p.churchid = ?
    AND
      p.authorizedby = ?
    AND
      p.authcode = ?
    LIMIT 1
    ;
  `;

  db.query(sql, [churchid, authorizedBy, authcode], (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).send({
        msg: "unable to query for preauth",
        msgType: "error",
      });
    }

    if (!result.length) {
      return res.status(404).send({
        msg: "no records found",
        msgType: "error",
      });
    }

    const expiry = moment(result[0].expiresAt).utc();
    const isExpired = now.isAfter(expiry);

    if (isExpired) {
      return res.status(400).send({
        msg: "preauth is expired",
        msgType: "error",
        expiry: expiry.format(),
      });
    }

    const {
      id,
      firstname,
      lastname,
      authorizedByFirstName,
      authorizedByLastName,
      sentvia,
      expiresAt,
      createdAt,
    } = result[0];

    const futureDate = new Date(expiry.format());
    const currentDate = new Date(now.utc().format());
    const expiresInMilliseconds = futureDate - currentDate;
    const expiresInSeconds = Math.floor(expiresInMilliseconds / 1000);

    const registrationToken = jsonwebtoken.sign(
      {
        id: id,
        newUser: {
          firstname: firstname,
          lastname: lastname,
        },
        authorizedBy: {
          firstname: authorizedByFirstName,
          lastname: authorizedByLastName,
        },
        sentvia: sentvia,
        churchid: churchid,
        expiresAt: expiresAt,
        createdAt: createdAt,
      },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: expiresInSeconds }
    );

    return res.status(200).send({
      msg: "authorization verified",
      msgType: "success",
      registrationToken: registrationToken,
    });
  });
};
