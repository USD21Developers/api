const moment = require("moment-timezone");
const twilio = require("twilio");

const priceFromUSA = {
  sms: 0.007,
  mms: 0.02,
};

const hasEnoughBalance = async (type = "MMS") => {
  return new Promise((resolve, reject) => {
    const price = type === "MMS" ? priceFromUSA.mms : priceFromUSA.sms;
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    client.balance
      .fetch()
      .then((data) => {
        const balance = Math.round(data.balance * 100) / 100;
        const currency = data.currency;
        const hasEnough = balance >= price;

        if (currency !== "USD") return resolve(false);

        return resolve(hasEnough);
      })
      .catch((error) => {
        console.log(error);
        return resolve(false);
      });
  });
};

const storeSsid = (db, result, preauthid, churchid) => {
  return new Promise((resolve, reject) => {
    if (!result) return reject();
    if (!result.hasOwnProperty("sid")) return reject();
    if (typeof result.sid !== "string") return reject();
    if (result.sid.length !== 34) return reject();

    if (!result) return reject();

    const { sid, to, date_sent, price, price_unit } = result;

    if (!price) {
      return resolve();
    }

    console.log(require(util.inspect(result, 7, true, 7)));

    const sql = `
      UPDATE
        preauth
      SET
        msgSid = ?
      WHERE
        id = ?
      ;
    `;

    db.query(sql, [sid, preauthid], (error, result) => {
      if (error) {
        console.log(error);
        return reject();
      }

      const sql = `
        INSERT INTO costs_messaging(
          churchid,
          preauthid,
          type,
          amount,
          currency,
          dateIncurredUTC,
          addedAt
        ) VALUES(
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          UTC_TIMESTAMP()
        )
      `;

      let type;

      if (sid.substring(0, 2) === "SM") {
        type = "sms";
      } else if (sid.substring(0, 2) === "MM") {
        type = "mms";
      } else if (to.substring(0, 9) === "whatsapp:") {
        type = "whatsapp";
      }

      const dateIncurredUTC = moment(date_sent)
        .utc()
        .format("YYYY-MM-DD HH:mm:ss");

      db.query(
        sql,
        [churchid, preauthid, type, price, price_unit, dateIncurredUTC],
        (error, result) => {
          if (error) {
            console.log(error);
            return reject();
          }

          return resolve();
        }
      );
    });
  });
};

const getUserPermissions = (db, userid) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        usertype,
        userstatus,
        isAuthorized,
        canAuthorize,
        canAuthToAuth
      FROM
        users
      WHERE
        userid = ?
      LIMIT 1
      ;
    `;

    db.query(sql, [userid], (error, result) => {
      if (error) {
        console.log(error);
        return reject(error);
      }

      if (!result.length) {
        const errorMessage = "user not found";
        console.log(errorMessage);
        return reject(new Error(errorMessage));
      }

      return resolve(result[0]);
    });
  });
};

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
  const isLocal = req.headers.referer.indexOf("localhost") >= 0 ? true : false;
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  const userPermissions = await getUserPermissions(db, req.user.userid).catch(
    (error) => console.log(error)
  );

  if (typeof userPermissions !== "object") {
    return res.status(500).send({
      msg: "unable to query for user permissions",
      msgType: "error",
    });
  }

  // Parameters
  const firstName = req.body.firstName || null;
  const lastName = req.body.lastName || null;
  const churchid = req.body.churchid || null;
  const highestLeadershipRole = req.body.highestLeadershipRole || null;
  let methodOfSending = req.body.methodOfSending || null;
  const phoneNumber = req.body.phoneNumber || null;
  const phoneData = req.body.phoneData || null;
  const isWhatsApp = req.body.isWhatsApp || false;
  const email = req.body.email || null;
  const acceptedOath = req.body.acceptedOath || null;
  const notificationPhrases = req.body.notificationPhrases || null;
  const templates = req.body.templates || null;
  const localizedExpiryDate = req.body.localizedExpiryDate || null;
  const utcExpiryDate = req.body.utcExpiryDate || null;
  const smsTemplate = Buffer.from(templates.sms, "base64").toString("ascii");
  const emailTemplate = Buffer.from(templates.email, "base64").toString(
    "ascii"
  );

  if (isWhatsApp) {
    methodOfSending = "whatsapp";
  } else if (methodOfSending === "textmessage") {
    methodOfSending = "mms"; // default to MMS to ensure that outgoing messages are not broken into multiple parts
  }

  // Validate

  if (!firstName || !firstName.length) {
    return res.status(400).send({
      msg: "firstName is required",
      msgType: "error",
    });
  }

  if (!lastName || !lastName.length) {
    return res.status(400).send({
      msg: "lastName is required",
      msgType: "error",
    });
  }

  if (!churchid) {
    return res.status(400).send({
      msg: "churchid is required",
      msgType: "error",
    });
  }

  if (typeof churchid !== "number") {
    return res.status(400).send({
      msg: "churchid must be a number",
      msgType: "error",
    });
  }

  if (userPermissions.canAuthToAuth === 1) {
    if (!highestLeadershipRole || !highestLeadershipRole.length) {
      return res.status(400).send({
        msg: "highestLeadershipRole is required",
        msgType: "error",
      });
    }

    if (!["HCL and up", "BTL", "neither"].includes(highestLeadershipRole)) {
      return res.status(400).send({
        msg: "invalid value for highestLeadershipRole",
        msgType: "error",
      });
    }
  }

  if (!methodOfSending || !methodOfSending.length) {
    return res.status(400).send({
      msg: "methodOfSending is required",
      msgType: "error",
    });
  }

  if (
    !["sms", "mms", "email", "qrcode", "whatsapp"].includes(methodOfSending)
  ) {
    return res.status(400).send({
      msg: "invalid value for methodOfSending",
      msgType: "error",
    });
  }

  if (["sms", "mms", "whatsapp"].includes(methodOfSending)) {
    if (!phoneNumber || !phoneNumber.length) {
      return res.status(400).send({
        msg: "phoneNumber is required",
        msgType: "error",
      });
    }

    if (!phoneData) {
      return res.status(400).send({
        msg: "phoneData is required",
        msgType: "error",
      });
    }

    const phoneCountry = phoneData.iso2;
    const validation = require("./utils").validatePhone(
      phoneNumber,
      phoneCountry
    );
    let isValid = true;

    if (!validation.isPossibleNumber) isValid = false;
    if (!validation.isValidForRegion) isValid = false;
    if (!validation.isValidSmsType) isValid = false;
    if (!validation.e164Format) isValid = false;

    if (!isValid) {
      return res.status(400).send({
        msg: "phoneNumber is invalid",
        msgType: "error",
        validation: validation,
      });
    }
  }

  if (methodOfSending === "email") {
    if (!email || !email.length) {
      return res.status(400).send({
        msg: "email is required",
        msgType: "error",
      });
    }

    const emailValidator = require("email-validator");
    if (!emailValidator.validate(email)) {
      return res.status(400).send({
        msg: "email is invalid",
        msgType: "error",
      });
    }
  }

  if (!acceptedOath) {
    return res.status(400).send({
      msg: "invalid value for acceptedOath",
      msgType: "error",
    });
  }

  if (typeof acceptedOath !== "boolean") {
    return res.status(400).send({
      msg: "acceptedOath must be a boolean",
      msgType: "error",
    });
  }

  // Determine permissions of the authorizing user

  const sql = `
    SELECT
      firstname AS userFirstName,
      lastname AS userLastName,
      canAuthorize,
      canAuthToAuth,
      userType,
      userStatus
    FROM
      users
    WHERE
      userid = ?
    LIMIT 1
    ;
  `;

  db.query(sql, [req.user.userid], (error, result) => {
    if (error) {
      return res.status(500).send({
        msg: "unable to query for authorizing user's permissions",
        msgType: "error",
      });
    }

    if (!result.length) {
      return res.status(404).send({
        msg: "authorizing user was not found",
        msgType: "error",
      });
    }

    const userFirstName = result[0].userFirstName;
    const userLastName = result[0].userLastName;
    const canAuthorize = result[0].canAuthorize === 1 ? true : false;
    const canAuthToAuth = result[0].canAuthToAuth === 1 ? true : false;
    const userStatus = result[0].userStatus;

    if (userStatus !== "registered") {
      return res.status(400).send({
        msg: "invalid userStatus for authorizing user",
        msgType: "error",
      });
    }

    if (!canAuthorize) {
      return res.status(400).send({
        msg: "authorizing user does not have permission to authorize",
        msgType: "error",
      });
    }

    if (
      highestLeadershipRole === "HCL and up" ||
      highestLeadershipRole === "BTL"
    ) {
      if (!canAuthToAuth) {
        return res.status(400).send({
          msg: "authorizing user does not have permission to authorize for this leadership role",
          msgType: "error",
          highestLeadershipRole: highestLeadershipRole,
        });
      }
    }

    // Store the authorization

    const randomString = (len) => {
      var p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      return [...Array(len)].reduce(
        (a) => a + p[~~(Math.random() * p.length)],
        ""
      );
    };

    const expiry = moment(utcExpiryDate).format("YYYY-MM-DD HH:mm:ss");

    let authUrl;
    const authCode = randomString(6);
    if (isLocal) {
      authUrl = `http://localhost:5555/a/#/${churchid}/${req.user.userid}/${authCode}`;
    } else if (isStaging) {
      authUrl = `https://staging.invites.mobi/a/${churchid}/${req.user.userid}/${authCode}`;
    } else {
      authUrl = `https://invites.mobi/a/${churchid}/${req.user.userid}/${authCode}`;
    }

    const sql = `
      INSERT INTO preauth(
        authorizedby,
        name,
        sentvia,
        canAuthorize,
        canAuthToAuth,
        churchid,
        authcode,
        expiresAt,
        createdAt
      ) VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        UTC_TIMESTAMP()
      )
    `;

    db.query(
      sql,
      [
        req.user.userid,
        `${firstName} ${lastName}`,
        methodOfSending,
        canAuthorize,
        canAuthToAuth,
        churchid,
        authCode,
        expiry,
      ],
      async (error, result) => {
        if (error) {
          return res.status(500).send({
            msg: "unable to store authorization",
            msgType: "error",
          });
        }

        const insertId = result.insertId;

        // If authorization was via QR code, return out immediately

        if (methodOfSending === "qrcode") {
          return res.status(200).send({
            msg: "new user authorized",
            msgType: "success",
            qrCodeUrl: authUrl,
          });
        }

        // Send message (i.e. MMS, SMS, WhatsApp, or e-mail)

        const {
          emailSubject,
          sentence1,
          sentence2,
          sentence2HTML,
          sentence3,
          sentence4,
          sentence5,
          sentence6,
          sincerely,
          internetMinistry,
        } = notificationPhrases;

        const utils = require("./utils");

        if (methodOfSending === "mms") {
          let msg = smsTemplate;
          msg = msg.replaceAll("{SENTENCE-1}", sentence1);
          msg = msg.replaceAll("{SENTENCE-2}", sentence2);
          msg = msg.replaceAll("{SENTENCE-3}", sentence3);
          msg = msg.replaceAll("{SENTENCE-4}", sentence4);
          msg = msg.replaceAll("{SENTENCE-5}", sentence5);
          msg = msg.replaceAll("{DEADLINE-DATE}", localizedExpiryDate);
          msg = msg.replaceAll("{MORE-INFO}", sentence6);
          msg = msg.replaceAll("{NEW-USER-FIRST-NAME}", firstName);
          msg = msg.replaceAll("{FIRST-NAME}", userFirstName);
          msg = msg.replaceAll("{LAST-NAME}", userLastName);
          msg = msg.replaceAll("{LINK}", authUrl);

          const canSendMms = await hasEnoughBalance(phoneNumber);

          if (!canSendMms) {
            return res.status(200).send({
              msg: "not enough money to send text message",
              msgType: "error",
            });
          }

          const mmsResult = await utils.sendMms(phoneNumber, msg);

          await storeSsid(db, mmsResult, insertId, churchid);

          return res.status(200).send({
            msg: "new user authorized",
            msgType: "success",
            mmsResult: mmsResult,
          });
        }

        if (methodOfSending === "sms") {
          let msg = smsTemplate;
          msg = msg.replaceAll("{SENTENCE-1}", sentence1);
          msg = msg.replaceAll("{SENTENCE-2}", sentence2);
          msg = msg.replaceAll("{SENTENCE-3}", sentence3);
          msg = msg.replaceAll("{SENTENCE-4}", sentence4);
          msg = msg.replaceAll("{SENTENCE-5}", sentence5);
          msg = msg.replaceAll("{DEADLINE-DATE}", localizedExpiryDate);
          msg = msg.replaceAll("{MORE-INFO}", sentence6);
          msg = msg.replaceAll("{NEW-USER-FIRST-NAME}", firstName);
          msg = msg.replaceAll("{FIRST-NAME}", userFirstName);
          msg = msg.replaceAll("{LAST-NAME}", userLastName);
          msg = msg.replaceAll("{LINK}", authUrl);

          const canSendSms = await hasEnoughBalance(phoneNumber);

          if (!canSendSms) {
            return res.status(200).send({
              msg: "not enough money to send text message",
              msgType: "error",
            });
          }

          const smsResult = await utils.sendSms(phoneNumber, msg);

          await storeSsid(db, smsResult, insertId, churchid);

          return res.status(200).send({
            msg: "new user authorized",
            msgType: "success",
            smsResult: smsResult,
          });
        }

        if (methodOfSending === "whatsapp") {
          let msg = smsTemplate;
          msg = msg.replaceAll("{SENTENCE-1}", sentence1);
          msg = msg.replaceAll("{SENTENCE-2}", sentence2);
          msg = msg.replaceAll("{SENTENCE-3}", sentence3);
          msg = msg.replaceAll("{SENTENCE-4}", sentence4);
          msg = msg.replaceAll("{SENTENCE-5}", sentence5);
          msg = msg.replaceAll("{DEADLINE-DATE}", localizedExpiryDate);
          msg = msg.replaceAll("{MORE-INFO}", sentence6);
          msg = msg.replaceAll("{NEW-USER-FIRST-NAME}", firstName);
          msg = msg.replaceAll("{FIRST-NAME}", userFirstName);
          msg = msg.replaceAll("{LAST-NAME}", userLastName);
          msg = msg.replaceAll("{LINK}", authUrl);

          const canSendWhatsApp = hasEnoughBalance(phoneNumber);

          if (!canSendWhatsApp) {
            return res.status(200).send({
              msg: "not enough money to send text message",
              msgType: "error",
            });
          }

          const whatsAppResult = await utils.sendWhatsApp(phoneNumber, msg);

          await storeSsid(db, whatsAppResult, insertId, churchid);

          return res.status(200).send({
            msg: "new user authorized",
            msgType: "success",
            whatsAppResult: whatsAppResult,
          });
        }

        if (methodOfSending === "email") {
          let msg = emailTemplate;
          msg = msg.replaceAll("{SENTENCE-1}", sentence1);
          msg = msg.replaceAll("{SENTENCE-2}", sentence2HTML);
          msg = msg.replaceAll("{SENTENCE-3}", sentence3);
          msg = msg.replaceAll("{SENTENCE-4}", sentence4);
          msg = msg.replaceAll("{SENTENCE-5}", sentence5);
          msg = msg.replaceAll("{DEADLINE-DATE}", localizedExpiryDate);
          msg = msg.replaceAll("{MORE-INFO}", sentence6);
          msg = msg.replaceAll("{NEW-USER-FIRST-NAME}", firstName);
          msg = msg.replaceAll("{FIRST-NAME}", userFirstName);
          msg = msg.replaceAll("{LAST-NAME}", userLastName);
          msg = msg.replaceAll("{LINK}", authUrl);
          msg = msg.replaceAll("{SINCERELY}", sincerely);
          msg = msg.replaceAll("{INTERNET-MINISTRY}", internetMinistry);

          const senderEmail = `invites.mobi <fp-admin@usd21.org>`;

          const emailResult = await utils.sendEmail(
            email,
            senderEmail,
            emailSubject,
            msg
          );

          return res.status(200).send({
            msg: "new user authorized",
            msgType: "success",
            emailResult: emailResult,
          });
        }
      }
    );
  });
};
