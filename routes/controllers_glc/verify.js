const utils = require("./utils");

exports.POST = (req, res) => {
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-glc-test")
    : require("../../database-glc");

  const email = req.body.email || "";
  const validator = require("email-validator");
  const isValidEmail = validator.validate(email);
  const isPrivilegedEmailAccount = utils.isPrivilegedEmailAccount;
  let protocol = "https:";
  let host = "glc.usd21.org";

  if (process.env.ENV === "development") {
    protocol = "http:";
    host = "localhost:5000";
  }

  if (!email.length)
    return res.status(400).send({ msg: "e-mail is missing", msgType: "error" });

  if (!isValidEmail)
    return res.status(400).send({
      msg: "invalid e-mail format",
      msgType: "error",
    });

  if (!isPrivilegedEmailAccount(email)) {
    return res.status(400).send({
      msg: "usd21 e-mail account is required",
      msgType: "error"
    })
  }

  const sql = `
    SELECT
      userid,
      firstname,
      lastname,
      email
    FROM
      users
    WHERE
      email = ?
    LIMIT
      1
    ;
  `;

  db.query(sql, [email], (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).send({ msg: "unable to query for e-mail address", msgType: "error" });
    }

    if (!result.length) {
      return res.status(404).send({ msg: "e-mail not found", msgType: "error" });
    }

    const userid = result[0].userid;
    const email = result[0].email;
    const fullname = `${result[0].firstname} ${result[0].lastname}`;

    // TODO:  Add token to tokens table

    const loginToken = require("crypto")
      .randomBytes(32)
      .toString("hex");

    const sql = `
      INSERT INTO tokens(
        token,
        expiry,
        userid,
        createdAt
      ) VALUES (
        ?,
        ADDTIME(utc_timestamp(), "24:0:0"),
        ?,
        utc_timestamp()
      );
    `;

    db.query(sql, [loginToken, userid], (error, result) => {
      if (error) {
        console.log(error);
        return res.status(500).send({
          msg: "unable to insert login token",
          msgType: "error"
        });
      }

      const emailParagraph1 = `This message is for ${fullname}. In order to verify your e-mail address, please click on the link below:`;

      const confirmationUrl = `${protocol}//${host}/admin/confirm/#${loginToken}`;

      const emailLinkText = `Verify my e-mail`;

      const emailSignature = `The Cyberministry`;

      const body = `
        <p>
          ${emailParagraph1}
        </p>
        <p style="margin: 30px 0">
          <strong>
            <big>
              <a href="${confirmationUrl}" style="text-decoration: underline">
                ${emailLinkText}
              </a>
            </big>
          </strong>
        </p>
        <p>${emailSignature}</p>
      `;

      const recipient = `"${fullname}" <${email}>`;
      const emailSenderText = "GLC Admin";
      const emailSubject = "Confirm your e-mail address";

      require("./utils")
        .sendEmail(recipient, emailSenderText, emailSubject, body)
        .then((result) => {
          return res.status(result[0].statusCode || 200).send({
            msg: "confirmation e-mail sent",
            msgType: "success",
          });
        })
        .catch((error) => {
          return res.status(500).send({
            msg: "confirmation e-mail could not be sent",
            msgType: "error",
            error: error,
          });
        });
    });

    // TODO:  Build verified landing page, to extract the token from the URL and verify it
    // TODO:  Build token verification API, and send back JWT if token is verified  
  });
}