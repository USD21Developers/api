exports.POST = (req, res) => {
  const db = require("../../database");
  const email = req.body.email || "";
  const lang = req.body.lang || "en";
  let protocol = "https:";
  let host;
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  switch (process.env.ENV) {
    case "development":
      protocol = "http:";
      host = "localhost:5000";
      break;
    case "production":
      host = isStaging
        ? "staging.firstprinciples.mobi"
        : "firstprinciples.mobi";
      break;
  }
  const validator = require("email-validator");
  const isValidEmail = validator.validate(email);

  if (!isValidEmail)
    return res.status(400).send({
      msg: "invalid e-mail format",
      msgType: "error",
    });

  const sql = `
    SELECT 
      u.userid,
      u.fullname, 
      u.email,
      t.token,
      t.expiry
    FROM
      users u
    LEFT OUTER JOIN
      tokens t ON t.userid = u.userid
    WHERE
      u.email = ?
    LIMIT 1
    ;
  `;
  db.query(sql, [email], (err, result) => {
    if (err) {
      console.log(err);
      return res
        .status(500)
        .send({ msg: "unable to query for email", msgType: "error" });
    }
    if (!result.length)
      return res.status(404).send({ msg: "user not found", msgType: "error" });
    const moment = require("moment");
    const userid = result[0].userid;
    const fullname = result[0].fullname;
    const recipientEmail = result[0].email;
    let resetToken = require("crypto").randomBytes(32).toString("hex");
    const timeSent = moment();
    const createdAt = timeSent.format("YYYY-MM-DD HH:mm:ss");
    const passwordResetExpiry = moment().add(20, "minutes");
    const passwordResetExpiryMySQL = passwordResetExpiry.format(
      "YYYY-MM-DD HH:mm:ss"
    );
    const tokenInDatabase = result[0].token || "";
    const expiryInDatabase = result[0].expiry || "";
    const expiryStillInTheFuture = expiryInDatabase.length
      ? timeSent.isBefore(expiryInDatabase)
      : false;
    if (expiryStillInTheFuture && tokenInDatabase.length)
      resetToken = tokenInDatabase;

    const sql =
      "INSERT INTO tokens(token, expiry, purpose, userid, createdAt) VALUES (?, ?, 'password reset', ?, ?);";
    db.query(
      sql,
      [resetToken, passwordResetExpiryMySQL, userid, createdAt],
      (err, result2) => {
        if (err) {
          console.log(err);
          return res.status(500).send({
            msg: "unable to update user record",
            msgType: "error",
          });
        }
        const uuid = require("uuid");
        const messageID = uuid.v4();
        const utils = require("../utils");
        const resetUrl = `${protocol}//${host}/lang/${lang}/account/reset-password#token=${resetToken}`;
        const senderEmail = `First Principles <fp-admin@usd21.org>`;
        const subject = "Reset your password";
        const body = `
          <p>This message is for ${fullname}. We just received your request to reset your password.  To do so, please click on the following link within 20 minutes of your request:</p>
          <p style="margin: 30px 0"><strong><big><a href="${resetUrl}" style="text-decoration: underline">Reset my password</a></big></strong></p>
          <p>The Cyberministry</p>
        `;
        utils
          .sendEmail(recipientEmail, senderEmail, subject, body)
          .then((result) => {
            return res.status(result[0].statusCode || 200).send({
              msg: "password reset e-mail sent",
              msgType: "success",
            });
          })
          .catch((error) => {
            console.log(error);
            return res.status(500).send({
              msg: "password reset e-mail could not be sent",
              msgType: "error",
              error: error,
            });
          });
      }
    );
  });
};
