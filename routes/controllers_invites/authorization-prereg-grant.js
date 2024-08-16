const moment = require("moment-timezone");

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

  if (isNaN(churchid)) {
    return res.status(400).send({
      msg: "churchid must be a number",
      msgType: "error",
    });
  }

  let newUserCanAuthorize = 0;
  let newUserCanAuthToAuth = 0;

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

    if (highestLeadershipRole === "HCL and up") {
      newUserCanAuthorize = 1;
      newUserCanAuthToAuth = 1;
    } else if (highestLeadershipRole === "BTL") {
      newUserCanAuthorize = 1;
    }
  }

  if (!methodOfSending || !methodOfSending.length) {
    return res.status(400).send({
      msg: "methodOfSending is required",
      msgType: "error",
    });
  }

  if (
    !["textmessage", "whatsapp", "email", "qrcode"].includes(methodOfSending)
  ) {
    return res.status(400).send({
      msg: "invalid value for methodOfSending",
      msgType: "error",
    });
  }

  if (["textmessage", "whatsapp"].includes(methodOfSending)) {
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

  // Store the authorization

  const generateOTP = (numCharacters = 6) => {
    const randomIntegers = [];

    const firstInt = Math.floor(Math.random() * 9) + 1;
    randomIntegers.push(firstInt);

    for (let i = 1; i < numCharacters; i++) {
      const randomInt = Math.floor(Math.random() * 10);
      randomIntegers.push(randomInt);
    }

    return parseInt(randomIntegers.join(""), 10);
  };

  const expiry = moment(utcExpiryDate).format("YYYY-MM-DD HH:mm:ss");

  const authCode = generateOTP(6);

  let authUrl = `https://invites.mobi/a/${churchid}/${req.user.userid}/${authCode}`;

  if (isLocal) {
    authUrl = `http://localhost:5555/a/#/${churchid}/${req.user.userid}/${authCode}`;
  } else if (isStaging) {
    authUrl = `https://staging.invites.mobi/a/${churchid}/${req.user.userid}/${authCode}`;
  }

  const sql = `
    INSERT INTO preauth(
      authorizedby,
      firstname,
      lastname,
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
      ?,
      UTC_TIMESTAMP()
    );
  `;

  db.query(
    sql,
    [
      req.user.userid,
      firstName,
      lastName,
      methodOfSending,
      newUserCanAuthorize,
      newUserCanAuthToAuth,
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

      // QR Code

      if (methodOfSending === "qrcode") {
        return res.status(200).send({
          msg: "new user authorized",
          msgType: "success",
          qrCodeUrl: authUrl,
          authCode: authCode,
        });
      }

      // Text message/WhatsApp
      if (["textmessage", "whatsapp"].includes(methodOfSending)) {
        return res.status(200).send({
          msg: "new user authorized",
          msgType: "success",
          url: authUrl,
          authCode: authCode,
        });
      }

      // E-mail

      const {
        emailSubject,
        sentence1,
        sentence2HTML,
        sentence3,
        sentence4,
        moreInfo,
        registerBefore,
        hereIsAuthCode,
        sincerely,
        internetMinistry,
      } = notificationPhrases;

      const utils = require("./utils");

      if (methodOfSending === "email") {
        let msg = emailTemplate;
        msg = msg.replaceAll("{SENTENCE-1}", sentence1);
        msg = msg.replaceAll("{NEW-USER-FIRST-NAME}", firstName);
        msg = msg.replaceAll("{SENTENCE-2}", sentence2HTML);
        msg = msg.replaceAll("{FIRST-NAME}", userFirstName);
        msg = msg.replaceAll("{LAST-NAME}", userLastName);
        msg = msg.replaceAll("{SENTENCE-3}", sentence3);
        msg = msg.replaceAll("{SENTENCE-4}", sentence4);
        msg = msg.replaceAll("{MORE-INFO}", moreInfo);
        msg = msg.replaceAll("{LINK}", authUrl);
        msg = msg.replaceAll("{REGISTER-BEFORE}", registerBefore);
        msg = msg.replaceAll("{DEADLINE-DATE}", localizedExpiryDate);
        msg = msg.replaceAll("{HERE-IS-AUTH-CODE}", hereIsAuthCode);
        msg = msg.replaceAll("{AUTH-CODE}", authCode);
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
};
