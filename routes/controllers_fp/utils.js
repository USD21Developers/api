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
  const sender = `"${emailSenderText}" <${process.env.SENDGRID_API_SENDER_EMAIL}>`;
  return new Promise((resolve, reject) => {
    const nodemailer = require("nodemailer");
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_SERVER,
      port: process.env.SMTP_PORT_SSL,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PWD,
      },
    });
    const message = {
      to: recipient,
      from: sender,
      subject: subject,
      html: body,
    };
    transport.sendMail(message, (err, info) => {
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
  try {
    result = await sendEmailViaAPI(recipient, emailSenderText, subject, body);
  } catch (err) {
    result = err;
  }
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
