const crypto = require("crypto");
const emailValidator = require("email-validator");

const verifyAuthCode = (db, churchid, authCode) => {
  return new Promise((resolve, reject) => {
    let returnObject = {
      isValid: false,
      canAuthorize: false,
      canAuthToAuth: false,
      churchid: {
        asAuthorized: null,
        asRegistered: Number(churchid),
      },
      authorizedby: null,
    };
    const sql = `
      SELECT
        canAuthorize,
        canAuthToAuth,
        authorizedby,
        churchid
      FROM
        preauth
      WHERE
        authcode = ?
      AND
        userid IS NULL
      AND
        claimedAt IS NULL
      AND
        expiresAt > UTC_TIMESTAMP()
      LIMIT 1
      ;
    `;

    db.query(sql, [Number(authCode), Number(churchid)], (error, result) => {
      if (error) {
        return resolve(returnObject);
      }

      if (!result.length) {
        return resolve(returnObject);
      }

      // Populate return object
      returnObject.isValid = true;
      returnObject.canAuthorize = result[0].canAuthorize === 1 ? true : false;
      returnObject.canAuthToAuth = result[0].canAuthToAuth === 1 ? true : false;
      returnObject.authorizedby = result[0].authorizedby
        ? Number(result[0].authorizedby)
        : null;
      returnObject.churchid.asAuthorized = Number(result[0].churchid);

      // Reset everything if churches don't match
      if (Number(churchid) !== Number(result[0].churchid)) {
        returnObject.isValid = false;
        returnObject.canAuthorize = false;
        returnObject.canAuthToAuth = false;
      }

      return resolve(returnObject);
    });
  });
};

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
  const profileImage140 = req.body.profileImage140 || "";
  const profileImage400 = req.body.profileImage400 || "";
  const lang = req.body.lang || "en";
  const country = req.body.country.substring(0, 2).toLowerCase() || "";
  const churchid = req.body.churchid || "";
  const unlistedchurch = req.body.unlistedchurch || ""; // TODO: notify admin that this church needs to be added
  const cameToFaithViaApp = req.body.cameToFaithViaApp;
  const emailSenderText = req.body.emailSenderText || "";
  const emailSubject = req.body.emailSubject || "";
  const emailParagraph1 = req.body.emailParagraph1 || "";
  const emailLinkText = req.body.emailLinkText || "";
  const emailSignature = req.body.emailSignature || "";
  const datakey = req.body.dataKey || "";
  let preAuth = req.body.preAuth || null;
  const authCode = req.body.authCode || null;
  const settings = JSON.stringify({
    openingPage: "home",
    customInviteText: "",
    enableEmailNotifications: true,
    enablePushNotifications: false,
    autoAddToFollowupList: false,
  });

  if (preAuth) {
    if (typeof preAuth !== "object") {
      preAuth = JSON.parse(preAuth);
    }
  }

  const isUsd21Email =
    email.substring(email.length - 10, email.length) === "@usd21.org"
      ? true
      : false;

  const isIccmGlobalEmail =
    email.substring(email.length - 12, email.length) === "@iccm.global"
      ? true
      : false;

  let protocol = "https:";
  let host = "invites.mobi";

  switch (process.env.ENV) {
    case "development":
      protocol = "http:";
      host = "localhost:5555";
      break;
    case "staging":
      host = "staging.invites.mobi";
    case "production":
      if (isStaging) {
        host = "staging.invites.mobi";
      } else {
        host = "invites.mobi";
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

  if (!profileImage400.length)
    return res
      .status(400)
      .send({ msg: "profile photo 400x400 missing", msgType: "error" });

  if (!profileImage140.length)
    return res
      .status(400)
      .send({ msg: "profile photo 140x140 missing", msgType: "error" });

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

  if (isNaN(cameToFaithViaApp)) {
    return res.status(400).send({
      msg: "cameToFaithViaApp must be a number",
      msgType: "error",
    });
  }

  if (cameToFaithViaApp !== 0 && cameToFaithViaApp !== 1) {
    return res.status(400).send({
      msg: "cameToFaithViaApp must be equal to either 0 or 1",
      msgType: "error",
    });
  }

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
    db.query(sql, [email], async (err, result) => {
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
      let authorizedBy = null;

      let preAuthorization = null;

      if (preAuth) {
        // Apply permissions from pre-authorization (if it exists)
        preAuthorization = await verifyAuthCode(
          db,
          preAuth.churchid,
          preAuth.authcode
        );

        if (preAuthorization.isValid) {
          isAuthorized = 1;
          canAuthorize = preAuthorization.canAuthorize || 0;
          canAuthToAuth = preAuthorization.canAuthToAuth || 0;
          if (preAuthorization.authorizedby) {
            authorizedBy = preAuthorization.authorizedby;
          }
        }
      } else if (authCode) {
        // Apply permissions from authCode (if it exists)
        preAuthorization = await verifyAuthCode(db, churchid, authCode);

        if (preAuthorization.isValid) isAuthorized = 1;
        if (preAuthorization.canAuthorize) canAuthorize = 1;
        if (preAuthorization.canAuthToAuth) canAuthToAuth = 1;
        if (preAuthorization.authorizedby) {
          authorizedBy = preAuthorization.authorizedby;
        }
      }

      // Give privileges to USD21 e-mail account holders
      if (isUsd21Email) {
        isAuthorized = 1;
        canAuthorize = 1;
      }

      // Give privileges to ICCM e-mail account holders
      if (isIccmGlobalEmail) {
        isAuthorized = 1;
        canAuthorize = 1;
      }

      // Designate usertype as "sysadmin" if user's e-mail is a match
      const superUsers = JSON.parse(process.env.SUPERUSERS_INVITES);
      const superUserEmails = superUsers.map((item) => item.email);
      if (superUserEmails.includes(email)) {
        usertype = "sysadmin";
      }

      // Give user specific permissions if they're a sysadmin
      if (usertype === "sysadmin") {
        isAuthorized = 1;
        canAuthorize = 1;
        canAuthToAuth = 1;
      }

      const isPrivilegedEmailAccount =
        require("./utils").isPrivilegedEmailAccount;
      if (isPrivilegedEmailAccount(email)) {
        isAuthorized = 1;
        canAuthorize = 1;
        canAuthToAuth = 1;
      }

      // Derive symmetric encryption key from password
      const kekSalt = crypto.randomBytes(32);
      const kekSaltBase64 = new Buffer.from(kekSalt).toString("base64");
      const kekIterations = Number(process.env.INVITES_KEK_ITERATIONS);
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
              churchid, username, password, firstname, lastname, gender, email, usertype, lang, country, cameToFaithViaApp, datakey, isAuthorized, canAuthorize, canAuthToAuth, authorizedby, settings, createdAt
            ) VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, utc_timestamp()
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
              cameToFaithViaApp,
              dataKeyObj,
              isAuthorized,
              canAuthorize,
              canAuthToAuth,
              authorizedBy,
              settings,
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
              const forUrl = {
                churchid: "",
                authorizedby: "",
                authcode: "",
              };

              if (authCode) forUrl.authcode = Number(authCode);

              if (preAuthorization) {
                forUrl.churchid = Number(
                  preAuthorization.churchid.asRegistered
                );
                forUrl.authorizedby = Number(preAuthorization.authorizedby);
              }

              require("./utils").storeProfileImage(
                userid,
                profileImage400,
                profileImage140,
                db
              );

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

                const confirmationUrl = `${protocol}//${host}/register/confirm/#/${forUrl.churchid}/${forUrl.authorizedby}/${forUrl.authcode}/${registrationToken}`;

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
            }
          );
        }
      );
    });
  });
};
