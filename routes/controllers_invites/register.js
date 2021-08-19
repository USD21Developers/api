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
  const lang = req.body.lang || "en";
  const country = req.body.country.substring(0, 2).toLowerCase() || "";
  const churchid = req.body.churchid || "";
  const unlistedchurch = req.body.unlistedchurch || "";  // TODO: notify admin that this church needs to be added
  const emailSenderText = req.body.emailSenderText || "";
  const emailSubject = req.body.emailSubject || "";
  const emailParagraph1 = req.body.emailParagraph1 || "";
  const emailLinkText = req.body.emailLinkText || "";
  const emailSignature = req.body.emailSignature || "";
  const datakey = req.body.dataKey || "";

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
    return res.status(400).send({ msg: "first name missing", msgType: "error" });

  if (!lastname.length)
    return res.status(400).send({ msg: "last name missing", msgType: "error" });

  if (!lang.length)
    return res.status(400).send({ msg: "language missing", msgType: "error" });

  if (!country.length)
    return res.status(400).send({ msg: "country missing", msgType: "error" });

  if (!churchid.length)
    return res.status(400).send({ msg: "churchid missing", msgType: "error" });

  if (churchid == 0 && !unlistedchurch.length)
    return res.status(400).send({ msg: "unlisted church missing", msgType: "error" });

  if (!datakey.length)
    return res.status(400).send({ msg: "datakey missiong", msgType: "error" });

  // Check for duplicate username
  const sql = `SELECT userid FROM users WHERE username = ? LIMIT 1;`;
  db.query(sql, [username], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({
        msg: "unable to query for duplicate username",
        msgType: "error"
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
          msgType: "error"
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

      // Designate usertype as "sysadmin" if user's e-mail is a match
      const listOfSysadmins = [
        "kip@usd21.org",
        "ron@usd21.org",
        "jeremy@usd21.org",
        "jason.mcneill@usd21.org"
      ];
      if (listOfSysadmins.includes(email)) {
        usertype = "sysadmin";
      }

      // Give user specific permissions if they're a sysadmin
      if (usertype === "sysadmin") {
        isAuthorized = true;
        canAuthorize = true;
      }

      // Derive symmetric encryption key from password
      const salt = crypto.randomBytes(32);
      const iterations = 200000;
      const keylen = 32;
      const digest = "sha256";

      crypto.pbkdf2(password, salt, iterations, keylen, digest, (err, derivedKey) => {
        if (err) {
          console.log(err);
          return res.status(500).send({ msg: "unable to generate password hash", msgType: "error" });
        }

        const hashObj = JSON.stringify({
          salt: salt.toString("hex"),
          iterations: iterations,
          keylen: keylen,
          digest: digest,
          derivedKey: derivedKey.toString("hex"),
        });

        // Generate a key pair
        crypto.generateKeyPair("rsa", {
          modulusLength: 2048,
          publicKeyEncoding: {
            type: "spki",
            format: "der"
          },
          privateKeyEncoding: {
            type: "pkcs8",
            format: "der"
          }
        }, (err, publicKey, privateKey) => {
          if (err) {
            console.log(err);
            return res.status(500).send({ msg: "unable to generate key pair", msgType: "error" });
          }

          // Encrypt key pair with derived encryption key

          const algorithmPublicKey = "aes-256-cbc";
          const initVectorPublicKey = crypto.randomBytes(16);
          const cipherPublicKey = crypto.createCipheriv(algorithmPublicKey, derivedKey, initVectorPublicKey);
          let encryptedDataPublicKey = cipherPublicKey.update(publicKey, "utf-8", "hex");
          encryptedDataPublicKey += cipherPublicKey.final("hex");

          const algorithmPrivateKey = "aes-256-cbc";
          const initVectorPrivateKey = crypto.randomBytes(16);
          const cipherPrivateKey = crypto.createCipheriv(algorithmPrivateKey, derivedKey, initVectorPrivateKey);
          let encryptedDataPrivateKey = cipherPrivateKey.update(privateKey, "utf-8", "hex");
          encryptedDataPrivateKey += cipherPrivateKey.final("hex");

          const algorithmDataKey = "aes-256-cbc";
          const initVectorDataKey = crypto.randomBytes(16);
          const cipherDataKey = crypto.createCipheriv(algorithmDataKey, derivedKey, initVectorDataKey);
          let encryptedDataKey = cipherDataKey.update(datakey, "utf-8", "hex");
          encryptedDataKey += cipherDataKey.final("hex");

          const hexPublicKey = new Buffer.from(publicKey).toString("hex");
          const hexPrivateKey = new Buffer.from(privateKey).toString("hex");

          const sql = `
            INSERT INTO users(
              churchid, username, password, firstname, lastname, email, usertype, lang, country, publickey, privatekey, datakey, isAuthorized, canAuthorize, createdAt
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, utc_timestamp()
            );
          `;
          db.query(sql, [churchid, username, hashObj, firstname, lastname, email, usertype, lang, country, encryptedDataPublicKey, encryptedDataPrivateKey, encryptedDataKey, isAuthorized, canAuthorize], (err, result) => {
            if (err) {
              console.log(err);
              return res.status(500).send({ msg: "unable to insert new record", msgType: "error" });
            }

            const userid = result.insertId;
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
                  msgType: "error"
                });
              }

              const confirmationUrl = `${protocol}//${host}/registration/confirm/#${registrationToken}`;

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

              const recipient = `"${firstname} ${lastname}" <${email}>`;
              require("./utils")
                .sendEmail(recipient, emailSenderText, emailSubject, body)
                .then((result) => {
                  return res.status(result[0].statusCode || 200).send({
                    msg: "confirmation e-mail sent",
                    msgType: "success"
                  });
                })
                .catch((err) => {
                  console.log(err);
                  return res.status(500).send({
                    msg: "confirmation e-mail could not be sent",
                    msgType: "error"
                  });
                });
            });
          });
        });
      });
    });
  });
};
