const moment = require("moment-timezone");
const emailValidator = require("email-validator");

exports.POST = (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["sysadmin"];
  let isAuthorized = false;
  if (allowedUsertypes.includes(usertype)) isAuthorized = true;
  if (req.user.may_create_coupons) isAuthorized = true;
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

  // Get request params
  const language = req.body.language || "";
  const eventtype = req.body.eventtype || "";
  const eventtitle = req.body.eventtitle || "";
  const eventdescription = req.body.eventdescription || "";
  const frequency = req.body.frequency || "";
  const duration = req.body.duration || "";
  const durationInHours = req.body.duration || "";
  const startdate = req.body.startdate || "";
  const starttime = req.body.starttime || "";
  const multidayBeginDate = req.body.multidayBeginDate || "";
  const multidayBeginTime = req.body.multidayBeginTime || "";
  const multidayEndDate = req.body.multidayEndDate || "";
  const multidayEndTime = req.body.multidayEndTime || "";
  const timezone = req.body.timezone || "";
  const locationvisibility = req.body.locationvisibility || "";
  const addressLine1 = req.body.addressLine1 || "";
  const addressLine2 = req.body.addressLine2 || "";
  const addressLine3 = req.body.addressLine3 || "";
  const country = req.body.country || "";
  const latitude = req.body.latitude || "";
  const longitude = req.body.longitude || "";
  const otherLocationDetails = req.body.otherLocationDetails || "";
  const attendVirtuallyConnectionDetails = req.body.attendVirtuallyConnectionDetails || "";
  const contactFirstName = req.body.contactFirstName || "";
  const contactLastName = req.body.contactLastName || "";
  const contactPhone = req.body.contactPhone || "";
  const contactPhoneFormatted = req.body.contactPhoneFormatted || "";
  const contactPhoneCountryData = req.body.contactPhoneCountryData || "";
  const contactEmail = req.body.contactEmail || "";

  // VALIDATE

  const momentNow = moment.tz(moment(), timezone);

  // language
  if (language.trim().length !== 2) {
    return res.status(400).send({
      msg: "language is required",
      msgType: "error"
    });
  }

  // event type
  const validEventTypes = ["bible talk", "church", "other"];
  if (!validEventTypes.includes(eventtype)) {
    return res.status(400).send({
      msg: "a valid event type is required",
      msgType: "error"
    });
  }

  // event title
  if (!eventtitle.trim().length) {
    return res.status(400).send({
      msg: "event title is required",
      msgType: "error"
    });
  }

  // event description
  if (!eventdescription.trim().length) {
    return res.status(400).send({
      msg: "event description is required",
      msgType: "error"
    });
  }

  // frequency
  const validEventFrequencies = ["once", "Every Sunday", "Every Monday", "Every Tuesday", "Every Wednesday", "Every Thursday", "Every Friday", "Every Saturday"];
  if (!validEventFrequencies.includes(frequency)) {
    return res.status(400).send({
      msg: "a valid event frequency is required",
      msgType: "error"
    });
  }

  // duration (in days)
  const validDurations = ["", "same day", "multiple days"];
  let durationIsValid = true;
  if (!validDurations.includes(duration)) {
    durationIsValid = false;
  }
  if (frequency === "" && frequency !== "once") {
    durationIsValid = false;
  }
  if (!durationIsValid) {
    return res.status(400).send({
      msg: "a valid duration (in days) is required",
      msgType: "error"
    });
  }

  // duration (in hours)
  const durationInHoursRequired = (duration === "multiple days") ? false : true;
  if (durationInHoursRequired) {
    if (typeof durationInHours === "") {
      return res.status(400).send({
        msg: "duration (in hours) is required",
        msgType: "error"
      });
    }
    if (typeof durationInHours !== "number") {
      return res.status(400).send({
        msg: "duration (in hours) must be a number",
        msgType: "error"
      });
    }
    if (durationInHours < 0.5 || durationInHours > 8) {
      return res.status(400).send({
        msg: "duration (in hours) must be between 0.5 and 8 hours",
        msgType: "error"
      });
    }
  }

  // time zone
  if (!timezone.length) {
    return res.status(400).send({
      msg: "time zone is required",
      msgType: "error"
    });
  }

  // start date (not multiday)
  if (duration !== "multiple days") {
    if (startdate.trim().length === 0) {
      return res.status(400).send({
        msg: "startdate is required",
        msgType: "error"
      });
    }

    const isValidDate = moment.tz(startdate, timezone).isValid();
    if (!isValidDate) {
      return res.status(400).send({
        msg: "a valid startdate is required",
        msgType: "error"
      });
    }

    // start time
    if (starttime.trim().length === 0) {
      return res.status(400).send({
        msg: "starttime is required",
        msgType: "error"
      });
    }

    // recurring weekday must match next occurence weekday
    if (frequency !== "once") {
      const nextOccuranceWeekday = moment.tz(`${startdate} ${starttime}`).format("dddd");
      let hasWeekdayConflict = false;
      switch (frequency) {
        case "Every Sunday": {
          if (nextOccuranceWeekday !== "Sunday") hasWeekdayConflict = true;
          break;
        }
        case "Every Monday": {
          if (nextOccuranceWeekday !== "Monday") hasWeekdayConflict = true;
          break;
        }
        case "Every Tuesday": {
          if (nextOccuranceWeekday !== "Tuesday") hasWeekdayConflict = true;
          break;
        }
        case "Every Wednesday": {
          if (nextOccuranceWeekday !== "Wednesday") hasWeekdayConflict = true;
          break;
        }
        case "Every Thursday": {
          if (nextOccuranceWeekday !== "Thursday") hasWeekdayConflict = true;
          break;
        }
        case "Every Friday": {
          if (nextOccuranceWeekday !== "Friday") hasWeekdayConflict = true;
          break;
        }
        case "Every Saturday": {
          if (nextOccuranceWeekday !== "Saturday") hasWeekdayConflict = true;
          break;
        }
      }

      if (hasWeekdayConflict) {
        return res.status(400).send({
          msg: "weekday of recurring date must match weekday of next occurence",
          msgType: "error"
        });
      }
    }

    const momentStartDateTime = moment.tz(`${startdate} ${starttime}`, timezone);
    const isValidDateTime = momentStartDateTime.isValid();

    if (!isValidDateTime) {
      return res.status(400).send({
        msg: "a valid starttime is required",
        msgType: "error"
      });
    }

    const isInThePast = momentNow.isAfter(momentStartDateTime) ? true : false;

    if (isInThePast) {
      return res.status(400).send({
        msg: "startdate and starttime must not be in the past",
        msgType: "error"
      });
    }
  }

  // multiday
  if (duration === "multiple days") {

    // multiday begin date
    if (multidayBeginDate.trim().length === 0) {
      return res.status(400).send({
        msg: "multidayBeginDate is required",
        msgType: "error"
      });
    }

    const isValidMultidayBeginDate = moment.tz(multidayBeginDate, timezone).isValid();
    if (!isValidMultidayBeginDate) {
      return res.status(400).send({
        msg: "a valid multidayBeginDate is required",
        msgType: "error"
      });
    }

    // multiday begin time
    if (multidayBeginTime.trim().length === 0) {
      return res.status(400).send({
        msg: "multidayBeginTime is required",
        msgType: "error"
      });
    }

    const momentMultidayStartDateTime = moment.tz(`${multidayBeginDate} ${multidayBeginTime}`, timezone);
    const isValidMultidayStartDateTime = momentMultidayStartDateTime.isValid();

    if (!isValidMultidayStartDateTime) {
      return res.status(400).send({
        msg: "a valid multidayBeginTime is required",
        msgType: "error"
      });
    }

    const multidayStartDateIsInThePast = momentNow.isAfter(momentMultidayStartDateTime) ? true : false;

    if (multidayStartDateIsInThePast) {
      return res.status(400).send({
        msg: "multidayBeginDate and multidayBeginTime must not be in the past",
        msgType: "error"
      });
    }

    // multiday end date
    if (multidayEndDate.trim().length === 0) {
      return res.status(400).send({
        msg: "multidayEndDate is required",
        msgType: "error"
      });
    }

    const isValidMultidayEndDate = moment.tz(multidayEndDate, timezone).isValid();
    if (!isValidMultidayEndDate) {
      return res.status(400).send({
        msg: "a valid multidayEndDate is required",
        msgType: "error"
      });
    }

    // multiday end time
    if (multidayEndTime.trim().length === 0) {
      return res.status(400).send({
        msg: "multidayEndTime is required",
        msgType: "error"
      });
    }

    const momentMultidayEndDateTime = moment.tz(`${multidayEndDate} ${multidayEndTime}`, timezone);
    const isValidMultidayEndDateTime = momentMultidayEndDateTime.isValid();

    if (!isValidMultidayEndDateTime) {
      return res.status(400).send({
        msg: "a valid multidayEndTime is required",
        msgType: "error"
      });
    }

    const multidayEndDateIsInThePast = momentNow.isAfter(isValidMultidayEndDateTime) ? true : false;

    if (multidayEndDateIsInThePast) {
      return res.status(400).send({
        msg: "multidayEndDate and multidayEndTime must not be in the past",
        msgType: "error"
      });
    }

    if (momentMultidayStartDateTime.isAfter(momentMultidayEndDateTime)) {
      return res.status(400).send({
        msg: "multidayBeginDate and multidayBeginTime must come before multidayEndDate and multidayEndTime",
        msgType: "error"
      });
    }

    const momentMultidayBeginDate = moment.tz(multidayBeginDate, timezone);
    const momentMultidayEndDate = moment.tz(multidayEndDate, timezone);
    if (momentMultidayBeginDate.isSame(momentMultidayEndDate)) {
      return res.status(400).send({
        msg: "multidayBeginDate and multidayEndDate must not be on the same day",
        msgType: "error"
      });
    }
  }

  // country
  if (country === "") {
    return res.status(400).send({
      msg: "country is required",
      msgType: "error"
    });
  }

  // Addresses must constitute at least 2 lines (unless in Japan, or unless coordinates supplied)
  let numAddressLines = 0;
  const line1Populated = (addressLine1.length > 0);
  const line2Populated = (addressLine2.length > 0);
  const line3Populated = (addressLine3.length > 0);
  const latPopulated = (latitude.length > 0);
  const longPopulated = (longitude.length > 0);
  const isJapan = (country === "jp");

  if (line1Populated) numAddressLines += 1;
  if (line2Populated) numAddressLines += 1;
  if (line3Populated) numAddressLines += 1;

  // If only one address line populated
  if ((numAddressLines === 1) && (!isJapan)) {
    return res.status(400).send({
      msg: "event address must have at least 2 lines",
      msgType: "error"
    });
  }

  // If only one coordinate is populated
  const oneCoordinateSupplied = (latPopulated || longPopulated);
  const bothCoordinatesSupplied = (latPopulated && longPopulated);
  if (oneCoordinateSupplied && !bothCoordinatesSupplied) {
    return res.status(400).send({
      msg: "both coordinates are required",
      msgType: "error"
    });
  }

  // If neither address nor coordinates were populated
  if ((!latPopulated) && (!longPopulated) && (numAddressLines === 0)) {
    return res.status(400).send({
      msg: "either an address or coordinates are required",
      msgType: "error"
    });
  }

  if (!contactFirstName.length) {
    return res.status(400).send({
      msg: "first name is required for contact person",
      msgType: "error"
    });
  }

  if ((!contactPhone.length) && (!contactEmail.length)) {
    return res.status(400).send({
      msg: "at least one method of contact is required",
      msgType: "error"
    });
  }

  if (contactPhone.length) {
    const validatePhone = require("./utils").validatePhone;
    const isValidPhoneNumber = validatePhone(contactPhone, contactPhoneCountryData.iso2);
    if (!isValidPhoneNumber) {
      return res.status(400).send({
        msg: "invalid phone number",
        msgType: "error"
      });
    }
  }

  if (contactEmail.length) {
    const isValidEmail = emailValidator.validate(contactEmail);
    if (!isValidEmail) {
      return res.status(400).send({
        msg: "invalid email",
        msgType: "error"
      });
    }
  }

  /* // TODO:  QUERY THE DATABASE

  const sql = ``;

  db.query(sql, [], (error, result) => {
    if (error)
      return res
        .status(500)
        .send({ msg: "", msgType: "error" });
    if (!result.length)
      return res.status(404).send({ msg: "", msgType: "error" });
  }); */
};
