const crypto = require("crypto");
const emailValidator = require("email-validator");

exports.POST = (req, res) => {
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");
  const username = req.body.username.toLowerCase().trim() || "";
  const password = req.body.password || "";
  const email = req.body.email || "";
  const firstname = req.body.firstname || "";
  const lastname = req.body.lastname || "";
  const gender = req.body.gender || "";
  const profileImage = req.body.profileImage || "";
  const lang = req.body.lang || "en";
  const country = req.body.country.substring(0, 2).toLowerCase() || "";
  const churchid = req.body.churchid || "";
  const unlistedchurch = req.body.unlistedchurch || ""; // TODO: notify admin that this church needs to be added
  const emailSenderText = req.body.emailSenderText || "";
  const emailSubject = req.body.emailSubject || "";
  const emailParagraph1 = req.body.emailParagraph1 || "";
  const emailLinkText = req.body.emailLinkText || "";
  const emailSignature = req.body.emailSignature || "";
  const datakey = req.body.dataKey || "";

  const isUsd21Email =
    email.substring(email.length - 10, email.length) === "@usd21.org"
      ? true
      : false;

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

  if (!username.length)
    return res.status(400).send({ msg: "username missing", msgType: "error" });

  if (!password.length)
    return res.status(400).send({ msg: "password missing", msgType: "error" });

  if (!email.length)
    return res.status(400).send({ msg: "e-mail missing", msgType: "error" });

  if (!emailValidator.validate(email))
    return res.status(400).send({ msg: "invalid e-mail", msgType: "error" });

  if (!firstname.length)
    return res
      .status(400)
      .send({ msg: "first name missing", msgType: "error" });

  if (!lastname.length)
    return res.status(400).send({ msg: "last name missing", msgType: "error" });

  if (gender !== "male" && gender !== "female") {
    return res.status(400).send({ msg: "gender missing", msgType: "error" });
  }

  if (!profileImage.length) return res.status(400).send({ msg: "profile photo missing", msgType: "error" });

  if (!lang.length)
    return res.status(400).send({ msg: "language missing", msgType: "error" });

  if (!country.length)
    return res.status(400).send({ msg: "country missing", msgType: "error" });

  if (!churchid.length)
    return res.status(400).send({ msg: "churchid missing", msgType: "error" });

  if (churchid == 0 && !unlistedchurch.length)
    return res
      .status(400)
      .send({ msg: "unlisted church missing", msgType: "error" });

  if (!datakey.length)
    return res.status(400).send({ msg: "datakey missiong", msgType: "error" });

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
          msgType: "error",
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

      let usertype = "user";
      let isAuthorized = 0;
      let canAuthorize = 0;
      let canAuthToAuth = 0;

      // Give privileges to USD21 e-mail account holders
      if (isUsd21Email) {
        isAuthorized = 1;
        canAuthorize = 1;
      }

      // Designate usertype as "sysadmin" if user's e-mail is a match
      const listOfSysadmins = [
        "kip@usd21.org",
        "ron@usd21.org",
        "jeremy@usd21.org",
        "jason.mcneill@usd21.org",
      ];
      if (listOfSysadmins.includes(email)) {
        usertype = "sysadmin";
      }

      // Give user specific permissions if they're a sysadmin
      if (usertype === "sysadmin") {
        isAuthorized = 1;
        canAuthorize = 1;
        canAuthToAuth = 1;
      }

      const isPrivilegedEmailAccount = require("./utils").isPrivilegedEmailAccount;
      if (isPrivilegedEmailAccount(email)) {
        isAuthorized = 1;
        canAuthorize = 1;
      }

      // Derive symmetric encryption key from password
      const kekSalt = crypto.randomBytes(32);
      const kekSaltBase64 = new Buffer.from(kekSalt).toString("base64");
      const kekIterations = 200000;
      const kekKeylen = 32;
      const kekDigest = "sha256";

      crypto.pbkdf2(
        password,
        kekSalt,
        kekIterations,
        kekKeylen,
        kekDigest,
        (err, kek) => {
          if (err) {
            console.log(err);
            return res.status(500).send({
              msg: "unable to generate password hash",
              msgType: "error",
            });
          }

          const algorithm = "aes-256-cbc";
          const dekKeyLen = 32;
          const dek = crypto.randomBytes(dekKeyLen);
          const dekIv = crypto.randomBytes(16);
          const dekCipher = crypto.createCipheriv(algorithm, kek, dekIv);
          let dekCiphertext = dekCipher.update(dek, "utf-8", "base64");
          dekCiphertext += dekCipher.final("base64");

          const iv = crypto.randomBytes(16);
          const ivBase64 = new Buffer.from(iv).toString("base64");
          const cipher = crypto.createCipheriv(algorithm, dek, iv);
          let ciphertext = cipher.update(datakey, "utf-8", "base64");
          ciphertext += cipher.final("base64");

          const dekIvBase64 = new Buffer.from(dekIv).toString("base64");

          const passwordObj = JSON.stringify({
            kek: {
              salt: kekSaltBase64,
              iterations: kekIterations,
              keylen: kekKeylen,
              digest: kekDigest,
            },
            dek: {
              algorithm: algorithm,
              iv: dekIvBase64,
              ciphertext: dekCiphertext,
            },
          });

          const dataKeyObj = JSON.stringify({
            algorithm: algorithm,
            iv: ivBase64,
            ciphertext: ciphertext,
          });

          const sql = `
            INSERT INTO users(
              churchid, username, password, firstname, lastname, gender, email, usertype, lang, country, datakey, isAuthorized, canAuthorize, canAuthToAuth, createdAt
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, utc_timestamp()
            );
          `;
          db.query(
            sql,
            [
              churchid,
              username,
              passwordObj,
              firstname,
              lastname,
              gender,
              email,
              usertype,
              lang,
              country,
              dataKeyObj,
              isAuthorized,
              canAuthorize,
              canAuthToAuth,
            ],
            async (err, result) => {
              if (err) {
                console.log(err);
                return res.status(500).send({
                  msg: "unable to insert new record",
                  msgType: "error",
                });
              }

              const userid = result.insertId;

              const profileImageURL = await require("./utils").storeProfileImage(userid, profileImage) || "";

              if (!profileImageURL.length) {
                return res.status(500).send({
                  msg: "unable to store profile photo",
                  msgType: "error",
                });
              }
              
              const sql = `
                UPDATE users
                SET profilephoto = ?
                WHERE userid = ?
                ;
              `;

              db.query(sql, [profileImageURL, userid], (err, result) => {
                if (err) {
                  console.log(err);
                  return res.status(500).send({
                    msg: "unable to update user with profile photo",
                    msgType: "error",
                  });
                }

                const sql = `
                  INSERT INTO unapprovedphotos(
                    userid,
                    createdAt
                  ) VALUES (
                    ?,
                    utc_timestamp()
                  ) 
                `;

                db.query(sql, [userid], (err, result) => {
                  if (err) {
                    console.log(err);
                    return res.status(500).send({
                      msg: "unable to submit photo for approval",
                      msgType: "error",
                    });
                  }

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
                      console.log(err);
                      return res.status(500).send({
                        msg: "unable to insert registration token",
                        msgType: "error",
                      });
                    }
    
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
                  `;
    
                    const recipient = `"${firstname} ${lastname}" <${email}>`;
                    require("./utils")
                      .sendEmail(recipient, emailSenderText, emailSubject, body)
                      .then((result) => {
                        return res.status(result[0].statusCode || 200).send({
                          msg: "confirmation e-mail sent",
                          msgType: "success",
                        });
                      })
                      .catch((err) => {
                        console.log(err);
                        return res.status(500).send({
                          msg: "confirmation e-mail could not be sent",
                          msgType: "error",
                        });
                      });
                  });
                });
              });
            }
          );
        }
      );
    });
  });
};
