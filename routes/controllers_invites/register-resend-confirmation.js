const crypto = require("crypto");
const emailValidator = require("email-validator");

exports.POST = (req, res) => {
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");
  const email = req.body.email || "";
  const emailSenderText = req.body.emailSenderText || null;
  const emailSubject = req.body.emailSubject || null;
  const emailParagraph1 = req.body.emailParagraph1 || null;
  const emailLinkText = req.body.emailLinkText || null;
  const emailSignature = req.body.emailSignature || null;
  const lang = req.body.lang || null;

  let protocol = "https:";
  let host;

  switch (process.env.ENV) {
    case "development":
      protocol = "http:";
      host = "localhost:5555";
      break;
    case "production":
      if (isStaging) {
        if (req.headers.referer.indexOf("staging.invites.usd21.org")) {
          host = "staging.invites.usd21.org";
        } else {
          host = "staging.invites.mobi";
        }
      } else {
        if (req.headers.referer.indexOf("invites.usd21.org")) {
          host = "invites.usd21.org";
        } else {
          host = "invites.mobi";
        }
      }
      break;
  }

  // Validate

  if (!email || !email.length) {
    return res
      .status(400)
      .send({ msg: "email parameter is required", msgType: "error" });
  }

  if (!emailValidator.validate(email)) {
    return res
      .status(400)
      .send({ msg: "invalid e-mail address", msgType: "error" });
  }

  if (!emailSenderText) {
    return res.status(400).send({
      msg: "emailSenderText parameter is required",
      msgType: "error",
    });
  }

  if (!emailSubject) {
    return res.status(400).send({
      msg: "emailSubject parameter is required",
      msgType: "error",
    });
  }

  if (!emailParagraph1) {
    return res.status(400).send({
      msg: "emailParagraph1 parameter is required",
      msgType: "error",
    });
  }

  if (!emailLinkText) {
    return res.status(400).send({
      msg: "emailLinkText parameter is required",
      msgType: "error",
    });
  }

  if (!emailSignature) {
    return res.status(400).send({
      msg: "emailSignature parameter is required",
      msgType: "error",
    });
  }

  if (!lang) {
    return res.status(400).send({
      msg: "lang parameter is required",
      msgType: "error",
    });
  }

  // Verify whether account still exists

  const sql = `
    SELECT
      userid, email, userstatus, createdAt, updatedAt
    FROM
      users
    WHERE
      email = ?
    LIMIT 1
    ;
  `;

  db.query(sql, [email], (error, result) => {
    if (error) {
      return res.status(500).send({
        msg: "unable to query for registrant",
        msgType: "error",
        email: email,
      });
    }

    if (!result.length) {
      return res.status(404).send({
        msg: "registrant not found",
        msgType: "error",
        email: email,
      });
    }

    if (result[0].userstatus === "frozen") {
      return res.status(400).send({
        msg: "user account is frozen",
        msgType: "success",
        createdAt: createdAt,
        updatedAt: updatedAt,
        email: email,
      });
    }

    if (result[0].userstatus === "registered") {
      return res.status(200).send({
        msg: "user already registered successfully",
        msgType: "success",
        createdAt: createdAt,
        updatedAt: updatedAt,
        email: email,
      });
    }

    if (result[0].userstatus !== "pending confirmation") {
      return res.status(400).send({
        msg: "unable to recognize status of account",
        msgType: "error",
        createdAt: createdAt,
        updatedAt: updatedAt,
        email: email,
        userstatus: result[0].userstatus,
      });
    }

    const userid = result[0].userid;

    const registrationToken = crypto.randomBytes(32).toString("hex");

    const sql = `
      INSERT INTO tokens(
        token,
        expiry,
        purpose,
        userid,
        createdAt
      ) VALUES (
        ?,
        ADDTIME(utc_timestamp(), "24:0:0"),
        'registration',
        ?,
        utc_timestamp()
      );
    `;

    db.query(sql, [registrationToken, userid], (err, result) => {
      if (err) {
        // console.log(err);
        return res.status(500).send({
          msg: "unable to insert registration token",
          msgType: "error",
        });
      }

      const uuid = require("crypto").randomUUID();

      const confirmationUrl = `${protocol}//${host}/register/confirm/#${registrationToken}`;

      const body = `
        <p>
          ${emailParagraph1}
        </p>
        <p style="margin: 30px 0">
          <strong>
            <big>
              <a href="${confirmationUrl}" style="text-decoration: underline" target="_blank" rel="noopener noreferrer">
                ${emailLinkText}
              </a>
            </big>
          </strong>
        </p>
        <p>${emailSignature}</p>
        <br>
        <br>
        <div class="messageUUID">
          <hr style="border: 0; border-top: 1px solid #dddddd" />
          <small><small style="font-size: 10px; color: #dddddd">
            Message ID: ${uuid}
          </small></small>
        </div>
      `;

      const recipient = `"${firstname} ${lastname}" <${email}>`;
      require("./utils")
        .sendEmail(recipient, emailSenderText, emailSubject, body)
        .then((result) => {
          return res.status(result[0].statusCode || 200).send({
            msg: "confirmation e-mail sent again",
            msgType: "success",
            email: email,
            createdAt: createdAt,
            updatedAt: updatedAt,
          });
        })
        .catch((err) => {
          console.log(err);
          return res.status(500).send({
            msg: "confirmation e-mail could not be sent again",
            msgType: "error",
            email: email,
            createdAt: createdAt,
            updatedAt: updatedAt,
          });
        });
    });
  });
};
