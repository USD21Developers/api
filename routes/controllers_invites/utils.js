// Use the following middleware function on all protected routes
exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  const jsonwebtoken = require("jsonwebtoken");
  if (!token)
    return res
      .status(400)
      .send({ msg: "missing access token", msgType: "error" });

  jsonwebtoken.verify(
    token,
    process.env.ACCESS_TOKEN_SECRET,
    (err, userdata) => {
      if (err)
        return res
          .status(403)
          .send({ msg: "invalid access token", msgType: "error", err: err });
      req.user = userdata;
      next();
    }
  );
};

exports.isPrivilegedEmailAccount = (email = "") => {
  const privilegedDomains = ["usd21.org"];
  let isPrivilegedEmail = false;

  // Validate
  const validator = require("email-validator");
  if (!validator.validate(email)) return false;

  // Format
  const validEmail = email.trim().toLowerCase();

  // Match
  privilegedDomains.forEach(item => {
    if (validEmail.endsWith(`@${item}`)) isPrivilegedEmail = true;
  });

  return isPrivilegedEmail;
}

exports.sendSms = (recipient, content) => {
  const twilio = require("twilio");
  const client = new twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  let sender = TWILIO_PHONE_NUMBER;
  return new Promise((resolve, reject) => {
    client.messages
      .create({
        from: sender,
        to: recipient,
        body: content,
      })
      .then((message) => {
        console.log(require("util").inspect(message, true, 7, true));
        resolve(message);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

sendEmailViaSMTP = (recipient, emailSenderText, subject, body) => {
  const sender = `"${emailSenderText}" <${process.env.SMTP_SENDER_EMAIL}>`;
  return new Promise((resolve, reject) => {
    const nodemailer = require("nodemailer");
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.SMTP_SENDER_EMAIL,
        serviceClient: process.env.SMTP_SERVICE_CLIENT,
        privateKey: process.env.SMTP_PRIVATE_KEY,
      },
    });
    const mailOptions = {
      from: sender,
      to: recipient,
      subject: subject,
      html: body,
    };
    transport.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.log(require("util").inspect(err, true, 7, true));
        reject(err);
      }
      resolve(info);
    });
  });
};

sendEmailViaAPI = (recipient, emailSenderText, subject, body) => {
  const sender = `${emailSenderText} <${process.env.SENDGRID_API_SENDER_EMAIL}>`;
  const sgMail = require("@sendgrid/mail");
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const msg = {
    to: recipient,
    from: sender,
    subject: subject,
    html: body,
  };
  return new Promise((resolve, reject) => {
    sgMail
      .send(msg)
      .then((result) => {
        resolve(result);
      })
      .catch((error) => {
        console.log(require("util").inspect(error, true, 7, true));
        reject(error);
      });
  });
};

exports.sendEmail = async (recipient, emailSenderText, subject, body) => {
  let result;
  result = await sendEmailViaAPI(recipient, emailSenderText, subject, body);
  /* try {
    result = await sendEmailViaSMTP(recipient, emailSenderText, subject, body);
  } catch (err) {
    result =
      (await sendEmailViaAPI(recipient, emailSenderText, subject, body)) || err;
  } */
  return result;
};

/*
  METHOD:
  validatePhone

  EXAMPLE RETURN VALUE:
  {
    "isValidForRegion": true,
    "isPossibleNumber": true,
    "numberType": "FIXED_LINE_OR_MOBILE",
    "e164Format": "+12133251382",
    "nationalFormat": "(213) 325-1382"
  }
*/
exports.validatePhone = (number, countryCode) => {
  const PNF = require("google-libphonenumber").PhoneNumberFormat;
  const phoneUtil = require("google-libphonenumber").PhoneNumberUtil.getInstance();
  const phoneNumber = phoneUtil.parse(number, countryCode);
  const isValidForRegion = phoneUtil.isValidNumberForRegion(
    phoneNumber,
    countryCode
  );
  const numberType = phoneUtil.getNumberType(phoneNumber);
  const e164Format = phoneUtil.format(phoneNumber, PNF.E164) || "";
  const nationalFormat =
    phoneUtil.formatInOriginalFormat(phoneNumber, countryCode) || "";
  const isPossibleNumber = phoneUtil.isPossibleNumber(phoneNumber);

  /* 
    List of types:  
      URL:  https://github.com/google/libphonenumber/blob/master/java/libphonenumber/src/com/google/i18n/phonenumbers/PhoneNumberUtil.java
      Line:  search for "public enum PhoneNumberType"
  */
  const allTypes = [
    "FIXED_LINE",
    "MOBILE",
    "FIXED_LINE_OR_MOBILE",
    "TOLL_FREE",
    "PREMIUM_RATE",
    "SHARED_COST",
    "VOIP",
    "PERSONAL_NUMBER",
    "PAGER",
    "UAN",
    "VOICEMAIL",
    "UNKNOWN",
  ];
  const validSmsTypes = [
    "FIXED_LINE",
    "MOBILE",
    "FIXED_LINE_OR_MOBILE",
    "VOIP",
    "PERSONAL_NUMBER",
    "PAGER",
    "VOICEMAIL",
    "UNKNOWN",
  ];
  const returnedSmsType = allTypes[numberType];
  const isValidSmsType = validSmsTypes.includes(returnedSmsType);
  const returnObject = {
    isPossibleNumber: isPossibleNumber,
    isValidForRegion: isValidForRegion,
    isValidSmsType: isValidSmsType,
    e164Format: e164Format,
    nationalFormat: nationalFormat,
  };
  return returnObject;
};

exports.smsToken = () => {
  const token = Math.floor(100000 + Math.random() * 900000);
  return token;
};

exports.validateNewPassword = (password) => {
  let isValid = false;
  const zxcvbn = require("zxcvbn");
  const complexityScoreMeasured = zxcvbn(password).score || 0;
  const minimumComplexityScore = 3;

  if (complexityScoreMeasured >= minimumComplexityScore) isValid = true;

  return isValid;
};

exports.getEventsByUser = (db, userid) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        eventid,
        churchid,
        type,
        title,
        description,
        frequency,
        duration,
        durationInHours,
        timezone,

        CONCAT(
          DATE_FORMAT(startdate, '%Y-%m-%d'),
              'T',
              TIME_FORMAT(startdate, '%T'),
              'Z'
        ) AS startdate,

        CONCAT(
          DATE_FORMAT(multidaybegindate, '%Y-%m-%d'),
              'T',
              TIME_FORMAT(multidaybegindate, '%T'),
              'Z'
        ) AS multidaybegindate,

        CONCAT(
          DATE_FORMAT(multidayenddate, '%Y-%m-%d'),
              'T',
              TIME_FORMAT(multidayenddate, '%T'),
              'Z'
        ) AS multidayenddate,
        
        locationvisibility,
        locationname,
        locationaddressline1,
        locationaddressline2,
        locationaddressline3,
        locationcoordinates,
        otherlocationdetails,
        virtualconnectiondetails,
        hasvirtual,
        contactfirstname,
        contactlastname,
        contactemail,
        contactphone,
        contactphonecountrydata,
        country,
        lang
      FROM
        events
      WHERE
        createdBy = ?
      AND
        isDeleted = 0
      ;
    `;

    db.query(sql, [userid], (error, result) => {
      if (error) reject(error);

      resolve(result);
    });
  });
}

exports.getAddressCoordinates = (db, addressObj) => {
  return new Promise((resolve, reject) => {
    if (!db) reject(new Error("db is a required argument to getAddressCoordinates"));
    if (!addressObj) reject(new Error("addressObj is a required argument to getAddressCoordinates"));
    if (typeof addressObj !== "object") reject(new Error("addressObj argument to getAddressCoordinates must be an object"));
    if (typeof process.env.GOOGLE_MAPS_API_KEY !== "string") reject(new Error("Missing environment variable for Google Maps API key"));
    if (!process.env.GOOGLE_MAPS_API_KEY.length) reject(new Error("Environment variable for Google Maps API key must not be blank"));

    const { line1, line2, line3, country } = addressObj;
    let address = "";
    if (typeof line1 === "string" && line1.length) address = encodeURIComponent(line1);
    if (typeof line2 === "string" && line2.length) address += "," + encodeURIComponent(line2);
    if (typeof line3 === "string" && line3.length) address += "," + encodeURIComponent(line3);
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const endpoint = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&region=${country}&key=${apiKey}`;
    const fetch = require("node-fetch");

    fetch(endpoint)
      .then(res => res.json())
      .then(data => {
        if (!data.results) {
          resolve("");
        } else if (!data.results.length) {
          resolve("");
        }
        const coordinates = data.results[0].geometry.location;
        resolve(coordinates);
      })
      .catch(err => {
        console.log(err);
        reject(err);
      });
  });
}

exports.getChurches = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const churches = await require("../controllers_services/churches").GET();
      resolve(churches);  
    } catch(err) {
      reject(new Error("unable to get churches", err))
    }
  });
}

exports.getDistance = (db, originObj, destinationObj) => {
  return new Promise((resolve, reject) => {
    if (!db) reject(new Error("db is a required argument to getAddressCoordinates"));
    if (!originObj) reject(new Error("originObj is a required argument to getDistance"));
    if (!destinationObj) reject(new Error("destinationObj is a required argument to getDistance"));
    if (typeof originObj !== "object") reject(new Error("originObj argument to getDistance must be an object"));
    if (typeof destinationObj !== "object") reject(new Error("destinationObj argument to getDistance must be an object"));
    if (typeof process.env.GOOGLE_MAPS_API_KEY !== "string") reject(new Error("Missing environment variable for Google Maps API key"));
    if (!process.env.GOOGLE_MAPS_API_KEY.length) reject(new Error("Environment variable for Google Maps API key must not be blank"));

    const { line1: originLine1, line2: originLine2, line3: originLine3, latitude: originLatitude, longitude: originLongitude, country: originCountry } = originObj;
    const { line1: destinationLine1, line2: destinationLine2, line3: destinationLine3, latitude: destinationLatitude, longitude: destinationLongitude, country: destinationCountry } = destinationObj;

    let origin = "";
    if (typeof originLatitude === "number" && typeof originLongitude === "number") {
      origin = `${originLatitude},${originLongitude}`;
    } else {
      if (typeof originLine1 === "string" && originLine1.length) origin = encodeURIComponent(originLine1);
      if (typeof originLine2 === "string" && originLine2.length) origin += "," + encodeURIComponent(originLine2);
      if (typeof originLine3 === "string" && originLine3.length) origin += "," + encodeURIComponent(originLine3);
    }

    let destination = "";
    if (typeof destinationLatitude === "number" && typeof destinationLongitude === "number") {
      destination = `${destinationLatitude},${destinationLongitude}`;
    } else {
      if (typeof destinationLine1 === "string" && destinationLine1.length) destination = encodeURIComponent(destinationLine1);
      if (typeof destinationLine2 === "string" && destinationLine2.length) destination += "," + encodeURIComponent(destinationLine2);
      if (typeof destinationLine3 === "string" && destinationLine3.length) destination += "," + encodeURIComponent(destinationLine3);
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const endpoint = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${apiKey}`;
    const fetch = require("node-fetch");

    fetch(endpoint)
      .then(res => res.json())
      .then(data => {
        if (!data.rows) {
          resolve("");
        } else if (!data.rows.length) {
          resolve("");
        }

        const distanceObj = data.rows[0].distance;
        if (typeof distanceObj !== "object") return reject(new Error("invalid distance object from distance API"));
        if (typeof distance.text !== "string") return reject(new Error("invalid distance text from distance API"));
        if (typeof distance.value !== "number") return reject(new Error("invalid distance value from distance API"));

        resolve(distance);
      })
      .catch(err => {
        console.log(err);
        reject(err);
      })
  });
}

exports.storeProfileImage = (userid, base64Image) => {
  return new Promise((resolve, reject) => {
    const AWS = require("aws-sdk");
    const s3 = new AWS.S3({
      accessKeyId: process.env.INVITES_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.INVITES_AWS_SECRET_ACCESS_KEY
    });
    const filename = `${userid}_400.jpg`;
    const fileContent = new Buffer.from(base64Image.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const params = {
      Bucket: process.env.INVITES_AWS_BUCKET_NAME,
      Key: filename,
      Body: fileContent
    };

    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      }

      resolve(data.Location);
    });
  });
}