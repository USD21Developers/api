const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

let PROFILE_DIR = "/var/www/html/public/profiles";
let PROFILE_URL_BASE = "https://api.usd21.org/profiles";

if (process.env.ENV === "development") {
  PROFILE_DIR = path.join(__dirname, "../../public/profiles");
  PROFILE_URL_BASE = "http://localhost:4000/profiles";
}

if (!fs.existsSync(PROFILE_DIR)) {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
}

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

exports.hashString = (input) => {
  return crypto.createHash("sha256").update(input).digest("hex");
};

exports.hashStringAsync = async (input) => {
  return new Promise((resolve, reject) => {
    try {
      const hash = crypto.createHash("sha256").update(input).digest("hex");
      resolve(hash);
    } catch (error) {
      reject(error);
    }
  });
};

exports.isPrivilegedEmailAccount = (email = "") => {
  const privilegedDomains = ["usd21.org", "iccm.global"];
  let isPrivilegedEmail = false;

  // Validate
  const validator = require("email-validator");
  if (!validator.validate(email)) return false;

  // Format
  const validEmail = email.trim().toLowerCase();

  // Match
  privilegedDomains.forEach((item) => {
    if (validEmail.endsWith(`@${item}`)) isPrivilegedEmail = true;
  });

  return isPrivilegedEmail;
};

exports.isSuperUser = (db, userid) => {
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

    db.query(sql, [userid], (error, result) => {
      if (error) {
        return reject(error);
      }

      if (!result.length) {
        return reject("no records found");
      }

      const email = result[0].email;
      const superUsers = JSON.parse(process.env.SUPERUSERS_INVITES);
      const superUsersEmails = superUsers.map((item) => item.email);
      const isSuper = superUsersEmails.includes(email);

      return resolve(isSuper);
    });
  });
};

exports.sendSms = (recipient, content) => {
  const twilio = require("twilio");
  const client = new twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  let sender = process.env.TWILIO_PHONE_NUM;
  return new Promise((resolve, reject) => {
    client.messages
      .create({
        from: sender,
        to: recipient,
        body: content,
      })
      .then((message) => {
        console.log(require("util").inspect(message, true, 7, true));
        return resolve(message);
      })
      .catch((error) => {
        return reject(error);
      });
  });
};

exports.sendMms = (
  recipient,
  content,
  mediaUrl = "https://invites.mobi/_assets/img/shim.png"
) => {
  const twilio = require("twilio");
  const client = new twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  let sender = process.env.TWILIO_PHONE_NUM;
  return new Promise((resolve, reject) => {
    client.messages
      .create({
        from: sender,
        to: recipient,
        body: content,
        mediaUrl: mediaUrl,
      })
      .then((message) => {
        if (process.env.ENV === "development") {
          console.log(require("util").inspect(message, true, 7, true));
        }
        return resolve(message);
      })
      .catch((error) => {
        return reject(error);
      });
  });
};

exports.sendWhatsApp = (recipient, content) => {
  const twilio = require("twilio");
  const client = new twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  let sender = process.env.TWILIO_WHATSAPP_PHONE_NUM;
  return new Promise((resolve, reject) => {
    client.messages
      .create({
        from: sender,
        to: recipient,
        body: content,
      })
      .then((message) => {
        if (process.env.ENV === "development") {
          console.log(require("util").inspect(message, true, 7, true));
        }
        return resolve(message);
      })
      .catch((error) => {
        return reject(error);
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
        return reject(err);
      }
      return resolve(info);
    });
  });
};

x = (recipient, emailSenderText, subject, body) => {
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
        return resolve(result);
      })
      .catch((error) => {
        console.log(require("util").inspect(error, true, 7, true));
        return reject(error);
      });
  });
};

sendEmailViaAPI = (recipientName, recipientEmail, senderName, subject, body) => {
  const Mailjet = require('node-mailjet');
  const mailjet = Mailjet.apiConnect(
    process.env.MAILJET_KEY_ID,
    process.env.MAILJET_SECRET_KEY,
  );
  return new Promise((resolve, reject) => {
    console.log("Recipient name: ", recipientName);
    console.log("Recipient email: ", recipientEmail);
    console.log("Sender name: ", senderName);
    console.log("Sender email: ", process.env.SENDGRID_API_SENDER_EMAIL);
    console.log("Subject: ", subject);
    console.log("Body: ", body);

    const request = mailjet
      .post("send", { 'version': 'v3.1' })
      .request({
        "Messages": [
          {
            "From": {
              "Email": `${process.env.SENDGRID_API_SENDER_EMAIL}`,
              "Name": `${senderName}`
            },
            "To": [
              {
                "Email": `${recipientEmail}`,
                "Name": `${recipientName}`
              }
            ],
            "Subject": `${subject}`,
            "HTMLPart": `${body}`,
          }
        ]
      })
    request
      .then((result) => {
        const { response } = result;
        console.log(response);

        const mailResponse = {
          statusCode: 200,
          statusText: response.statusText,
        };

        resolve(mailResponse);
      })
      .catch((err) => {
        console.log(err);

        const mailResponse = {
          statusCode: 400,
          statusText: "Failed to send email via MailJet",
        };

        resolve(mailResponse);
      })
  });
};

exports.sendEmail = async (recipientName, recipientEmail, senderName, subject, body) => {
  let result;
  result = await sendEmailViaAPI(recipientName, recipientEmail, senderName, subject, body);
  return result;
};

exports.sendWebPush = async (
  db,
  userid,
  title,
  body,
  data = {},
  invitationid,
  ignoreUserSettings = false
) => {
  return new Promise((resolve, reject) => {
    // subscription object has an expiration.  Key should be "expirationTime" and it CAN be null.
    let sql = `
      SELECT
        ps.subscription AS subscription
      FROM
        pushsubscriptions ps
      INNER JOIN users u ON u.userid = ps.userid
      WHERE
        ps.userid = ?
      AND
        u.userstatus = 'registered'
      AND
        JSON_EXTRACT(u.settings, "$.enablePushNotifications") = true
      ;
    `;

    if (ignoreUserSettings) {
      sql = `
        SELECT
          ps.subscription AS subscription
        FROM
          pushsubscriptions ps
        INNER JOIN users u ON u.userid = ps.userid
        WHERE
          ps.userid = ?
        AND
          u.userstatus = 'registered'
        ;
      `;
    }

    db.query(sql, [userid], (error, result) => {
      if (error) {
        const errorMessage = "unable to query for push subscription";
        console.log(errorMessage);
        return reject(new Error(errorMessage, error));
      }

      if (!result.length) {
        return resolve();
      }

      const webpush = require("web-push");
      const payload = JSON.stringify({
        data: data,
        title: title,
        body: body,
      });

      const timeout = 30 * 1000; // 30 seconds
      const ttl = 86000; // 24 hours
      const urgency = "high"; // "high" delivers the message immediately

      const options = {
        timeout: timeout,
        TTL: ttl,
        urgency: urgency,
        vapidDetails: {
          subject: process.env.VAPID_IDENTIFIER,
          publicKey: process.env.VAPID_PUBLIC_KEY,
          privateKey: process.env.VAPID_PRIVATE_KEY,
        },
      };

      const promises = result.map((item) => {
        const subscription = JSON.parse(item.subscription);
        return webpush.sendNotification(subscription, payload, options);
      });

      Promise.all(promises)
        .then((results) => {
          resolve(results);
        })
        .catch((error) => {
          if (error.statusCode && error.statusCode === 410) {
            // If endpoint is not Apple's, resolve and do not reject, because non-Apple push service providers do not expire their subscriptions. Also, non-Apple push service providers can sometimes return code 410 errors erroneously.
            if (error.endpoint) {
              if (error.endpoint.includes("apple")) {
                reject(error);
              } else {
                resolve();
              }
            }
          } else {
            resolve();
          }
          resolve(error.stack);
        })
        .finally(() => {
          if (!invitationid) return;

          const sql = `
            UPDATE
              invitations
            SET
              lastTimeNotifiedViaPush = UTC_TIMESTAMP()
            WHERE
              invitationid = ?
            ;
          `;

          db.query(sql, [invitationid], (error, result) => {
            if (error) {
              console.log(
                new Error(
                  "unable to update invite with last time user was notified via push"
                )
              );
            }
          });
        });
    });
  });
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
  const phoneUtil =
    require("google-libphonenumber").PhoneNumberUtil.getInstance();
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
  const minimumComplexityScore = 2;

  if (complexityScoreMeasured >= minimumComplexityScore) isValid = true;

  return isValid;
};

exports.getEventsByUser = (db, userid, useridOfRequester) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        eventid,
        churchid,
        type,
        title,
        descriptionHeading,
        description,
        frequency,
        duration,
        durationInHours,
        timezone,

        CASE 
          WHEN frequency != 'once' AND startdate < CURRENT_TIMESTAMP() THEN CONCAT(DATE_FORMAT(DATE_ADD(startdate, INTERVAL (DATEDIFF(CURRENT_TIMESTAMP(), startdate) DIV 7 + 1) * 7 DAY), '%Y-%m-%dT%H:%i:%s'), 'Z')
          ELSE CONCAT(DATE_FORMAT(startdate, '%Y-%m-%dT%H:%i:%s'), 'Z')
        END AS startdate,

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
        sharewithfollowers,
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
      AND
        (
          createdBy = ?
          OR
          sharewithfollowers = "yes"
        )
      AND
          (
            frequency != 'once'
            OR
            (
              frequency = 'once'
              AND
              startdate >= CURRENT_TIMESTAMP()
            )
            OR
            multidayenddate >= CURRENT_TIMESTAMP()
          )
      ORDER BY
        title
      ;
    `;

    db.query(sql, [userid, useridOfRequester], (error, result) => {
      if (error) return reject(error);

      return resolve(result);
    });
  });
};

exports.getEventsByFollowedUsers = (db, userid, useridOfRequester) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        e.createdBy,
        e.eventid,
        e.churchid,
        e.type,
        e.title,
        e.descriptionHeading,
        e.description,
        e.frequency,
        e.duration,
        e.durationInHours,
        e.timezone,

        CASE 
          WHEN frequency != 'once' AND startdate < CURRENT_TIMESTAMP() THEN CONCAT(DATE_FORMAT(DATE_ADD(startdate, INTERVAL (DATEDIFF(CURRENT_TIMESTAMP(), startdate) DIV 7 + 1) * 7 DAY), '%Y-%m-%dT%H:%i:%s'), 'Z')
          ELSE CONCAT(DATE_FORMAT(startdate, '%Y-%m-%dT%H:%i:%s'), 'Z')
        END AS startdate,

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
        
        e.locationvisibility,
        e.locationname,
        e.locationaddressline1,
        e.locationaddressline2,
        e.locationaddressline3,
        e.locationcoordinates,
        e.otherlocationdetails,
        e.virtualconnectiondetails,
        e.hasvirtual,
        e.sharewithfollowers,
        e.contactfirstname,
        e.contactlastname,
        e.contactemail,
        e.contactphone,
        e.contactphonecountrydata,
        e.country,
        e.lang
      FROM
        events e
      INNER JOIN follow f ON e.createdBy = f.followed
      INNER JOIN users u ON u.userid = e.createdBy
      WHERE
        f.follower = ?
      AND
        e.isDeleted = 0
      AND
        (
          e.createdBy = ?
          OR
          e.sharewithfollowers = "yes"
        )
      AND
        (
          frequency != 'once'
          OR
          (
            frequency = 'once'
            AND
            startdate >= CURRENT_TIMESTAMP()
          )
          OR
          multidayenddate >= CURRENT_TIMESTAMP()
        )
      ORDER BY
        e.createdBy, e.title
      ;
    `;

    db.query(sql, [userid, useridOfRequester], (error, result) => {
      if (error) reject(error);

      return resolve(result);
    });
  });
};

exports.getSpecificEvents = (db, arrayOfInviteIds) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        eventid,
        churchid,
        type,
        title,
        descriptionHeading,
        description,
        frequency,
        duration,
        durationInHours,
        timezone,

        CASE 
          WHEN frequency != 'once' AND startdate < CURRENT_TIMESTAMP() THEN CONCAT(DATE_FORMAT(DATE_ADD(startdate, INTERVAL (DATEDIFF(CURRENT_TIMESTAMP(), startdate) DIV 7 + 1) * 7 DAY), '%Y-%m-%dT%H:%i:%s'), 'Z')
          ELSE CONCAT(DATE_FORMAT(startdate, '%Y-%m-%dT%H:%i:%s'), 'Z')
        END AS startdate,

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
        sharewithfollowers,
        contactfirstname,
        contactlastname,
        contactemail,
        contactphone,
        contactphonecountrydata,
        country,
        lang,
        isDeleted
      FROM
        events e
      WHERE
        eventid IN (SELECT eventid FROM invitations WHERE invitationid IN (?) GROUP BY eventid ORDER BY eventid)
      ;
    `;

    if (!Array.isArray(arrayOfInviteIds)) {
      return reject(new Error("arrayOfInviteIds must be an array"));
    }

    if (!arrayOfInviteIds.length) {
      return reject(new Error("arrayOfInviteIds must not be empty"));
    }

    db.query(sql, [arrayOfInviteIds], (error, result) => {
      if (error) {
        console.log(error);
        return reject(error);
      }

      return resolve(result);
    });
  });
};

exports.getEventsForAllInvites = (db, userid) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT DISTINCT
        e.eventid,
        churchid,
        type,
        title,
        descriptionHeading,
        description,
        frequency,
        duration,
        durationInHours,
        timezone,

        CASE 
          WHEN frequency != 'once' AND startdate < CURRENT_TIMESTAMP() THEN CONCAT(DATE_FORMAT(DATE_ADD(startdate, INTERVAL (DATEDIFF(CURRENT_TIMESTAMP(), startdate) DIV 7 + 1) * 7 DAY), '%Y-%m-%dT%H:%i:%s'), 'Z')
          ELSE CONCAT(DATE_FORMAT(startdate, '%Y-%m-%dT%H:%i:%s'), 'Z')
        END AS startdate,

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
        sharewithfollowers,
        contactfirstname,
        contactlastname,
        contactemail,
        contactphone,
        contactphonecountrydata,
        country,
        e.lang,
        e.isDeleted
      FROM
        events e
      INNER JOIN invitations i ON e.eventid = i.eventid
      WHERE
        i.userid = ?
      ORDER BY
        e.eventid ASC
      ;
    `;

    db.query(sql, [userid], (error, result) => {
      if (error) {
        console.log(error);
        return reject(error);
      }

      return resolve(result);
    });
  });
};

exports.removeLocationInfoFromDiscreetEvents = (arrayOfEvents) => {
  if (!Array.isArray(arrayOfEvents)) return [];

  const events = arrayOfEvents.map((event) => {
    const { locationvisibility } = event;
    const isDiscreetLocation = locationvisibility === "discreet" ? true : false;

    if (!isDiscreetLocation) {
      return event;
    }

    const modifiedEvent = {
      ...event,
      locationaddressline1: null,
      locationaddressline2: null,
      locationaddressline3: null,
      locationcoordinates: null,
      locationname: null,
      otherlocationdetails: null,
    };

    return modifiedEvent;
  });

  return events;
};

exports.getFollowedUsers = (db, userid) => {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        u.userid,
        u.churchid,
        u.lang,
        u.gender,
        u.firstname,
        u.lastname,
        u.profilephoto,
        u.usertype
      FROM
        users u
      INNER JOIN follow f ON f.followed = u.userid
      WHERE
        f.follower = ?
      AND
        u.userstatus = 'registered'
      ORDER BY
        u.lastname, u.firstname, u.userid
      ;
    `;

    db.query(sql, [userid], (error, result) => {
      if (error) return reject(error);

      return resolve(result);
    });
  });
};

exports.geocodeLocation = (db, location, country) => {
  return new Promise((resolve, reject) => {
    if (!db)
      return reject(new Error("db is a required argument to geocodeLocation"));
    if (!location)
      return reject(
        new Error("location is a required argument to geocodeLocation")
      );
    if (typeof process.env.GOOGLE_MAPS_API_KEY !== "string")
      return reject("Missing environment variable for Google Maps API key");
    if (!process.env.GOOGLE_MAPS_API_KEY.length)
      return reject(
        "Environment variable for Google Maps API key must not be blank"
      );

    const lines = location.split(/\r?\n/);
    let address;

    // Encode each line and concatenate
    if (lines.length === 1) {
      address = encodeURIComponent(lines[0]);
    } else {
      lines.forEach((line, index) => {
        let newLine = encodeURIComponent(line);
        if (index === lines.length - 1) {
          newLine += ",";
        }
        address += newLine;
      });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const endpoint = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&region=${country}&key=${apiKey}`;
    const fetch = require("node-fetch");

    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        if (!data.results || !data.results.length) {
          throw "geocode unsuccessful";
        }
        const coordinates = data.results[0].geometry.location;
        const coordsObject = {
          latitude: coordinates.lat,
          longitude: coordinates.lng,
        };
        return resolve(coordsObject);
      })
      .catch((err) => {
        return reject(err);
      });
  });
};

exports.getAddressCoordinates = (db, addressObj) => {
  return new Promise((resolve, reject) => {
    if (!db)
      return reject(
        new Error("db is a required argument to getAddressCoordinates")
      );
    if (!addressObj)
      return reject(
        new Error("addressObj is a required argument to getAddressCoordinates")
      );
    if (typeof addressObj !== "object")
      return reject(
        new Error(
          "addressObj argument to getAddressCoordinates must be an object"
        )
      );
    if (typeof process.env.GOOGLE_MAPS_API_KEY !== "string")
      return reject(
        new Error("Missing environment variable for Google Maps API key")
      );
    if (!process.env.GOOGLE_MAPS_API_KEY.length)
      return reject(
        new Error(
          "Environment variable for Google Maps API key must not be blank"
        )
      );

    const { line1, line2, line3, country } = addressObj;
    let address = "";
    if (typeof line1 === "string" && line1.length)
      address = encodeURIComponent(line1);
    if (typeof line2 === "string" && line2.length)
      address += "," + encodeURIComponent(line2);
    if (typeof line3 === "string" && line3.length)
      address += "," + encodeURIComponent(line3);
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const endpoint = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&region=${country}&key=${apiKey}`;

    const fetch = require("node-fetch");

    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        if (!data.results) {
          return resolve("");
        } else if (!data.results.length) {
          return resolve("");
        }

        const coordinates = data.results[0].geometry.location;
        return resolve(coordinates);
      })
      .catch((err) => {
        console.log(err);
        return reject(err);
      });
  });
};

exports.getChurches = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const churches = await require("../controllers_services/churches").GET();
      return resolve(churches);
    } catch (err) {
      return reject(new Error("unable to get churches", err));
    }
  });
};

exports.getDistance = (db, originObj, destinationObj) => {
  return new Promise((resolve, reject) => {
    if (!db)
      return reject(
        new Error("db is a required argument to getAddressCoordinates")
      );
    if (!originObj)
      return reject(
        new Error("originObj is a required argument to getDistance")
      );
    if (!destinationObj)
      return reject(
        new Error("destinationObj is a required argument to getDistance")
      );
    if (typeof originObj !== "object")
      return reject(
        new Error("originObj argument to getDistance must be an object")
      );
    if (typeof destinationObj !== "object")
      return reject(
        new Error("destinationObj argument to getDistance must be an object")
      );
    if (typeof process.env.GOOGLE_MAPS_API_KEY !== "string")
      return reject(
        new Error("Missing environment variable for Google Maps API key")
      );
    if (!process.env.GOOGLE_MAPS_API_KEY.length)
      return reject(
        new Error(
          "Environment variable for Google Maps API key must not be blank"
        )
      );

    const {
      line1: originLine1,
      line2: originLine2,
      line3: originLine3,
      latitude: originLatitude,
      longitude: originLongitude,
      country: originCountry,
    } = originObj;
    const {
      line1: destinationLine1,
      line2: destinationLine2,
      line3: destinationLine3,
      latitude: destinationLatitude,
      longitude: destinationLongitude,
      country: destinationCountry,
    } = destinationObj;

    let origin = "";
    if (
      typeof originLatitude === "number" &&
      typeof originLongitude === "number"
    ) {
      origin = `${originLatitude},${originLongitude}`;
    } else {
      if (typeof originLine1 === "string" && originLine1.length)
        origin = encodeURIComponent(originLine1);
      if (typeof originLine2 === "string" && originLine2.length)
        origin += "," + encodeURIComponent(originLine2);
      if (typeof originLine3 === "string" && originLine3.length)
        origin += "," + encodeURIComponent(originLine3);
    }

    let destination = "";
    if (
      typeof destinationLatitude === "number" &&
      typeof destinationLongitude === "number"
    ) {
      destination = `${destinationLatitude},${destinationLongitude}`;
    } else {
      if (typeof destinationLine1 === "string" && destinationLine1.length)
        destination = encodeURIComponent(destinationLine1);
      if (typeof destinationLine2 === "string" && destinationLine2.length)
        destination += "," + encodeURIComponent(destinationLine2);
      if (typeof destinationLine3 === "string" && destinationLine3.length)
        destination += "," + encodeURIComponent(destinationLine3);
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const endpoint = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${apiKey}`;
    const fetch = require("node-fetch");

    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        if (!data.rows) {
          return resolve("");
        } else if (!data.rows.length) {
          return resolve("");
        }

        const distanceObj = data.rows[0].distance;
        if (typeof distanceObj !== "object")
          return reject(new Error("invalid distance object from distance API"));
        if (typeof distance.text !== "string")
          return reject(new Error("invalid distance text from distance API"));
        if (typeof distance.value !== "number")
          return reject(new Error("invalid distance value from distance API"));

        return resolve(distance);
      })
      .catch((err) => {
        console.log(err);
        return reject(err);
      });
  });
};

exports.storeProfileImage = async (
  userid,
  profileImage400,
  profileImage140,
  db
) => {
  const uuid = crypto.randomUUID();

  // Delete any previous images
  await exports.deleteProfileImage(userid, db);

  // Build file names
  const fileName400 = `${userid}__${uuid}__400.webp`;
  const fileName140 = `${userid}__${uuid}__140.webp`;

  const filePath400 = path.join(PROFILE_DIR, fileName400);
  const filePath140 = path.join(PROFILE_DIR, fileName140);

  // Decode base64 images
  const buf400 = Buffer.from(
    profileImage400.replace(/^data:image\/\w+;base64,/, ""),
    "base64"
  );
  const buf140 = Buffer.from(
    profileImage140.replace(/^data:image\/\w+;base64,/, ""),
    "base64"
  );

  try {
    await fs.promises.writeFile(filePath400, buf400);
    await fs.promises.writeFile(filePath140, buf140);
  } catch (err) {
    console.error("Failed to write profile images:", err);
    throw err;
  }

  const storedUrl400 = `${PROFILE_URL_BASE}/${fileName400}`;

  // Update DB
  const sql = `
    UPDATE users
    SET profilephoto = ?, profilephoto_flagged = NULL
    WHERE userid = ?;
  `;
  await new Promise((resolve, reject) => {
    db.query(sql, [storedUrl400, userid], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  const sql2 = `DELETE FROM photoreview WHERE userid = ?;`;
  await new Promise((resolve, reject) => {
    db.query(sql2, [userid], (err) => (err ? reject(err) : resolve()));
  });

  const sql3 = `INSERT INTO photoreview(userid, createdAt) VALUES (?, utc_timestamp());`;
  await new Promise((resolve, reject) => {
    db.query(sql3, [userid], (err) => (err ? reject(err) : resolve()));
  });

  return storedUrl400;
};

exports.deleteProfileImage = async (userid, db) => {
  // Get profile photo info
  const result = await new Promise((resolve, reject) => {
    const sql = `
      SELECT profilephoto, profilephoto_flagged
      FROM users
      WHERE userid = ? AND profilephoto IS NOT NULL
      LIMIT 1;
    `;
    db.query(sql, [userid], (err, rows) => (err ? reject(err) : resolve(rows)));
  });

  if (!result.length) return; // Nothing to delete

  let { profilephoto, profilephoto_flagged } = result[0];
  let url = profilephoto.includes("profile-generic")
    ? profilephoto_flagged
    : profilephoto;

  const match = url.match(/profiles\/(.*?)\.webp/);
  if (!match) return;

  const file400 = path.join(PROFILE_DIR, match[1] + ".webp");
  const file140 = file400.replace("400.webp", "140.webp");

  // Delete files (ignore errors)
  for (const f of [file400, file140]) {
    try {
      await fs.promises.unlink(f);
    } catch (e) { }
  }

  // Clear DB
  const sql2 = `UPDATE users SET profilephoto = NULL, profilephoto_flagged = NULL WHERE userid = ?;`;
  await new Promise((resolve, reject) => {
    db.query(sql2, [userid], (err) => (err ? reject(err) : resolve()));
  });

  const sql3 = `DELETE FROM photoreview WHERE userid = ?;`;
  await new Promise((resolve, reject) => {
    db.query(sql3, [userid], (err) => (err ? reject(err) : resolve()));
  });
};
