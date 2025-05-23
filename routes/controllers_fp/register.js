const emailValidator = require("email-validator");

exports.POST = (req, res) => {
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-test")
    : require("../../database");
  const username = req.body.username || "";
  const password = req.body.password || "";
  const firstname = req.body.firstname || "";
  const lastname = req.body.lastname || "";
  const fullname = req.body.fullname || "";
  const email = req.body.email || "";
  const lang = req.body.lang || "en";
  const emailSenderText = req.body.emailSenderText || "";
  const emailSubject = req.body.emailSubject || "";
  const emailParagraph1 = req.body.emailParagraph1 || "";
  const emailLinkText = req.body.emailLinkText || "";
  const emailSignature = req.body.emailSignature || "";
  const country = req.body.country.substring(0, 2).toLowerCase() || "";

  let protocol = "https:";
  let host;
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

  // Validate

  if (!username.length)
    return res.status(400).send({ msg: "username missing", msgType: "error" });

  if (!password.length)
    return res.status(400).send({ msg: "password missing", msgType: "error" });

  if (!lastname.length)
    return res.status(400).send({ msg: "last name missing", msgType: "error" });

  if (!fullname.length)
    return res.status(400).send({ msg: "full name missing", msgType: "error" });

  if (!email.length)
    return res.status(400).send({ msg: "e-mail missing", msgType: "error" });

  if (!emailValidator.validate(email))
    return res.status(400).send({ msg: "invalid e-mail", msgType: "error" });

  if (!country.length)
    return res.status(400).send({ msg: "country missing", msgType: "error" });

  // Check for duplicate username
  const sql = `SELECT userid FROM users WHERE username = ? LIMIT 1;`;
  db.query(sql, [username], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({
        msg: "unable to query for duplicate username",
        msgType: "error",
        error: err,
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
      let usertype = "user";
      let may_create_coupons = 0;
      let may_create_preauthorized_users = 0;

      // Designate usertype as "sysadmin" if user's e-mail is a match
      const superUsers = JSON.parse(process.env.SUPERUSERS_FP);
      const superUserEmails = superUsers.map((item) => item.email);
      if (superUserEmails.includes(email)) {
        usertype = "sysadmin";
      }

      // Designate user as authorized to create coupons if user's e-mail is a match
      const listOfAuthorizedCouponMakers = ["donna.cruz@usd21.org"];
      if (listOfAuthorizedCouponMakers.includes(email)) {
        may_create_coupons = 1;
      }

      // Give user specific permissions if they're a sysadmin
      if (usertype === "sysadmin") {
        may_create_coupons = 1;
        may_create_preauthorized_users = 1;
      }

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
              country,
              usertype,
              may_create_coupons,
              may_create_preauthorized_users,
              createdAt
            ) VALUES(
              ?,
              ?,
              ?,
              ?,
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
              country,
              usertype,
              may_create_coupons,
              may_create_preauthorized_users,
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

                const confirmationUrl = `${protocol}//${host}/lang/${lang}/_confirm/#${registrationToken}`;

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
            }
          );
        });
      });
    });
  });
};
