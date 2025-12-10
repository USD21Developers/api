const validator = require("email-validator");
const crypto = require("crypto");

exports.POST = async (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["sysadmin", "user"];
  let isAuthorized = false;
  if (allowedUsertypes.includes(usertype)) isAuthorized = true;
  if (!isAuthorized) {
    console.log(`User (userid ${req.user.userid}) is not authorized.`);
    return res.status(401).send({
      msg: "user is not authorized for this action",
      msgType: "error",
    });
  }

  // Set database
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Parameters
  const churchid = req.body.churchid ? Number(req.body.churchid) : null;
  const email = req.body.email || null;
  const firstname = req.body.firstname || null;
  const lastname = req.body.lastname || null;
  let nameDisplayedOnInvite = req.body.nameDisplayedOnInvite || null;
  const password = req.body.password || null;
  const datakey = req.body.datakey || null;
  const emailSenderText = req.body.emailSenderText || "";
  const emailSubject = req.body.emailSubject || "";
  const emailParagraph1 = req.body.emailParagraph1 || "";
  const emailLinkText = req.body.emailLinkText || "";
  const emailSignature = req.body.emailSignature || "";

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

  const checkEmailChanged = (db, email) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          email
        FROM
          users
        WHERE
          userid = ?
        LIMIT 1
        ;
      `;

      db.query(sql, [req.user.userid], (error, result) => {
        if (error) {
          console.log(error);
          return resolve(false);
        }

        if (!result.length) {
          return resolve(false);
        }

        const isChanged = result[0].email === email ? false : true;

        return resolve(isChanged);
      });
    });
  };

  const sendChurchEmailAddressConfirmation = (db, email) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          canAuthorize,
          canAuthToAuth
        FROM
          users
        WHERE
          userid = ?
        LIMIT 1
        ;
      `;

      db.query(sql, [req.user.userid], (error, result) => {
        if (error) {
          console.log(error);
          return reject(error);
        }

        if (!result) {
          return reject(new Error("user not found"));
        }

        const { canAuthorize, canAuthToAuth } = result[0];

        if (canAuthorize || canAuthToAuth) {
          return resolve();
        }

        const token = crypto.randomBytes(32).toString("hex");
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
          'church email',
          ?,
          utc_timestamp()
        );
      `;

        db.query(sql, [token, req.user.userid], (error, result) => {
          if (error) {
            return reject(error);
          }

          const sql = `
          SELECT
            firstname,
            lastname
          FROM
            users
          WHERE
            userid = ?
          LIMIT 1
          ;
        `;

          db.query(sql, [req.user.userid], (error, result) => {
            if (error) {
              console.log(error);
              return reject(error);
            }

            if (!result.length) {
              return reject(new Error("user not found"));
            }

            const { firstname, lastname } = result[0];
            const uuid = require("crypto").randomUUID();
            const confirmationUrl = `${protocol}//${host}/profile/confirm-email/#/${token}`;

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
              .sendEmail(`${firstname}, ${lastname}`, email, emailSenderText, emailSubject, body)
              .then((result) => {
                return resolve(result[0]);
              })
              .catch((err) => {
                console.log(err);
                return reject(err);
              });
          });
        });
      });
    });
  };

  const updatePassword = (db, datakey, password) => {
    return new Promise((resolve, reject) => {
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
            return reject(new Error("unable to generate password hash"));
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
            UPDATE
              users
            SET
              password = ?,
              datakey = ?
            WHERE
              userid = ?
            ;
          `;

          db.query(
            sql,
            [passwordObj, dataKeyObj, req.user.userid],
            (error, result) => {
              if (error) {
                console.log(error);
                return reject(error);
              }

              return resolve(result);
            }
          );
        }
      );
    });
  };

  // Validate
  if (!churchid) {
    return res.status(400).send({
      msg: "churchid is required",
      msgType: "error",
    });
  }
  if (!email) {
    return res.status(400).send({
      msg: "email is required",
      msgType: "error",
    });
  }
  if (!validator.validate(email)) {
    return res.status(400).send({
      msg: "email is invalid",
      msgType: "error",
    });
  }
  if (!firstname || !firstname.length) {
    return res.status(400).send({
      msg: "firstname is required",
      msgType: "error",
    });
  }
  if (!lastname || !lastname.length) {
    return res.status(400).send({
      msg: "lastname is required",
      msgType: "error",
    });
  }
  if (!nameDisplayedOnInvite || !nameDisplayedOnInvite.length) {
    nameDisplayedOnInvite = firstname;
  }
  if (password && password.length) {
    const isValidPassword = require("./utils").validateNewPassword(password);
    if (!isValidPassword) {
      return res.status(400).send({
        msg: "password not complex enough",
        msgType: "error",
      });
    }
    if (!datakey) {
      return res.status(400).send({
        msg: "datakey is required when changing password",
        msgType: "error",
      });
    }
  }

  let churchEmailUnverified = 0;
  let isEmailChanged = false;
  const isPrivilegedEmailAccount =
    require("./utils").isPrivilegedEmailAccount(email);
  if (isPrivilegedEmailAccount) {
    isEmailChanged = await checkEmailChanged(db, email);
    if (isEmailChanged) {
      churchEmailUnverified = 1;
      await sendChurchEmailAddressConfirmation(db, email);
    }
  }

  const sql = `
    UPDATE
      users
    SET
      churchid = ?,
      email = ?,
      churchEmailUnverified = ?,
      firstname = ?,
      lastname = ?,
      nameDisplayedOnInvite = ?
    WHERE
      userid = ?
    ;
  `;

  db.query(
    sql,
    [
      churchid,
      email,
      churchEmailUnverified,
      firstname,
      lastname,
      nameDisplayedOnInvite,
      req.user.userid,
    ],
    async (error, result) => {
      if (error) {
        console.log(error);
        return res.status(500).send({
          msg: "unable to update profile",
          msgType: "error",
        });
      }

      if (password && password.length) {
        const updatePasswordResult = await updatePassword(
          db,
          datakey,
          password
        );
        // TODO:  handle potential promise rejections from "updatePasswordResult" above
      }

      const sql = `
        SELECT
          churchid,
          country,
          lang,
          userid,
          usertype,
          firstname,
          lastname,
          nameDisplayedOnInvite,
          email,
          churchEmailUnverified,
          username,
          gender,
          profilephoto,
          passwordmustchange,
          isAuthorized,
          canAuthorize,
          canAuthToAuth
        FROM
          users
        WHERE
          userid = ?
        LIMIT
          1
        ;
      `;

      db.query(sql, [req.user.userid], (error, result) => {
        if (error) {
          console.log(error);
          return res.status(500).send({
            msg: "unable to select data for new refresh token",
            msgType: "error",
          });
        }

        if (!result.length) {
          return res.status(404).send({
            msg: "user no longer exists",
            msgType: "error",
          });
        }

        const {
          churchid,
          country,
          lang,
          userid,
          usertype,
          firstname,
          lastname,
          nameDisplayedOnInvite,
          email,
          churchEmailUnverified,
          username,
          gender,
          profilephoto,
          passwordmustchange,
          isAuthorized,
          canAuthorize,
          canAuthToAuth,
        } = result[0];

        const jsonwebtoken = require("jsonwebtoken");
        const refreshToken = jsonwebtoken.sign(
          {
            churchid: churchid,
            country: country,
            lang: lang,
            userid: userid,
            usertype: usertype,
            firstname: firstname,
            lastname: lastname,
            nameDisplayedOnInvite: nameDisplayedOnInvite,
            email: email,
            churchEmailUnverified: churchEmailUnverified,
            username: username,
            gender: gender,
            profilephoto: profilephoto,
            mapsApiKeys: {
              prod: process.env.GOOGLE_MAPS_API_KEY_PROD,
              staging: process.env.GOOGLE_MAPS_API_KEY_STAGING,
              dev: process.env.GOOGLE_MAPS_API_KEY_DEV,
            },
            isAuthorized: isAuthorized,
            canAuthorize: canAuthorize,
            canAuthToAuth: canAuthToAuth,
          },
          process.env.REFRESH_TOKEN_SECRET,
          { expiresIn: "30d" }
        );

        const accessToken = jsonwebtoken.sign(
          {
            churchid: churchid,
            userid: userid,
            usertype: usertype,
            lang: lang,
            profilephoto: profilephoto,
            country: country,
            passwordmustchange: passwordmustchange,
            isAuthorized: isAuthorized,
            canAuthorize: canAuthorize,
            canAuthToAuth: canAuthToAuth,
          },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "10m" }
        );

        return res.status(200).send({
          msg: "profile updated",
          msgType: "success",
          refreshToken: refreshToken,
          accessToken: accessToken,
        });
      });
    }
  );
};
