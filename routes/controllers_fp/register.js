const emailValidator = require("email-validator");
const db = require("../../database");

exports.POST = (req, res) => {
  const {
    username = "",
    password = "",
    firstname = "",
    lastname = "",
    fullname = "",
    email = "",
    lang = "en",
    emailSender = "",
    emailSubject = "",
    emailParagraph1 = "",
    emailLinkText = "",
    emailSignature = "",
  } = req.body;

  let protocol;
  let host;

  switch (process.env.ENV) {
    case "development":
      protocol = "http:";
      host = "localhost:5000";
      break;
    case "staging":
      protocol = "https:";
      host = "staging.firstprinciples.mobi";
      break;
    case "production":
      protocol = "https:";
      host = "firstprinciples.mobi";
      break;
  }

  // Validate

  if (!username)
    return res.status(400).send({ msg: "username missing", msgType: "error" });

  if (!password)
    return res.status(400).send({ msg: "password missing", msgType: "error" });

  if (!lastname)
    return res.status(400).send({ msg: "last name missing", msgType: "error" });

  if (!fullname)
    return res.status(400).send({ msg: "full name missing", msgType: "error" });

  if (!email)
    return res.status(400).send({ msg: "e-mail missing", msgType: "error" });

  if (!emailValidator.validate(email))
    return res.status(400).send({ msg: "invalid e-mail", msgType: "error" });

  // Check for duplicate username
  const sql = `SELECT userid FROM users WHERE username = ? LIMIT 1;`;
  db.query(sql, [username], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({
        msg: "unable to query for duplicate username",
        msgType: "error",
      });
    }
    if (result.length)
      return res
        .status(400)
        .send({ msg: "username already exists", msgType: "error" });

    // Check for duplicate e-mail address
    const sql = `SELECT userid FROM users WHERE email = ? LIMIT 1;`;
    db.query(sql, [email], (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send({
          msg: "unable to query for duplicate e-mail address",
        });
      }
      if (result.length)
        return res
          .status(400)
          .send({ msg: "e-mail already exists", msgType: "error " });

      // Validate password complexity
      const isValidPassword = require("./utils").validateNewPassword(password);
      if (!isValidPassword)
        return res
          .status(400)
          .send({ msg: "password not complex enough", msgType: "error" });

      // Hash the password
      const bcrypt = require("bcrypt");
      const saltRounds = 10;
      bcrypt.genSalt(saltRounds, (err, salt) => {
        if (err) {
          console.log(err);
          return res.status(500).send({
            msg: "unable to generate password salt",
            msgType: "error",
            error: err,
          });
        }
        bcrypt.hash(password, salt, (err, hash) => {
          if (err) {
            console.log(err);
            return res.status(500).send({
              msg: "unable to generate password hash",
              msgType: "error",
              error: err,
            });
          }

          // Insert the new record
          const sql = `
            INSERT INTO users(
              username,
              password,
              fullname,
              firstname,
              lastname,
              email,
              createdAt
            ) VALUES(
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              utc_timestamp()
            )
          `;
          db.query(
            sql,
            [
              username.toLowerCase(),
              hash,
              fullname,
              firstname,
              lastname,
              email.toLowerCase(),
            ],
            (err, result) => {
              if (err) {
                console.log(err);
                return res.status(500).send({
                  msg: "unable to insert new record",
                  msgType: "error",
                });
              }

              const userid = result.insertId;

              const registrationToken = require("crypto")
                .randomBytes(32)
                .toString("hex");

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
                  console.log(err);
                  return res.status(500).send({
                    msg: "unable to insert registration token",
                    msgType: "error",
                    error: err,
                  });
                }

                const confirmationUrl = `${protocol}://${host}/${lang}/subscribe/register-confirm/#${registrationToken}`;

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

                require("../../routes/controllers_fp/utils")
                  .sendEmail(recipient, emailSender, emailSubject, body)
                  .then((result) => {
                    console.log(require("util").inspect(result, true, 7, true));
                    return res.status(200).send({
                      msg: "confirmation e-mail sent",
                      msgType: "success",
                      result: result,
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
            }
          );
        });
      });
    });
  });
};
