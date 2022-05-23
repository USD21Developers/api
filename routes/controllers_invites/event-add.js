const moment = require("moment");
const momentTimeZone = require("moment-timezone");
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
  let durationInHours = req.body.durationInHours || "";
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

  const momentNow = momentTimeZone.tz(moment().format(), timezone);

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
  if (duration === "multiple days") durationInHours = "";

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

    const isValidDate = momentTimeZone.tz(moment(startdate).format(), timezone).isValid();
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
      const nextOccuranceWeekday = momentTimeZone.tz(moment(`${startdate} ${starttime}`).format(), timezone).format("dddd");
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

    const momentStartDateTime = momentTimeZone.tz(moment(`${startdate} ${starttime}`).format(), timezone);
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

    const isValidMultidayBeginDate = momentTimeZone.tz(multidayBeginDate, timezone).isValid();
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

    const momentMultidayStartDateTime = momentTimeZone.tz(moment(`${multidayBeginDate} ${multidayBeginTime}`).format(), timezone);
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

    const isValidMultidayEndDate = momentTimeZone.tz(moment(multidayEndDate).format(), timezone).isValid();
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

    const momentMultidayEndDateTime = momentTimeZone.tz(moment(`${multidayEndDate} ${multidayEndTime}`).format(), timezone);
    const isValidMultidayEndDateTime = momentMultidayEndDateTime.isValid();

    if (!isValidMultidayEndDateTime) {
      return res.status(400).send({
        msg: "a valid multidayEndTime is required",
        msgType: "error"
      });
    }

    const multidayEndDateIsInThePast = momentNow.isAfter(momentMultidayEndDateTime) ? true : false;

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

    const momentMultidayBeginDate = momentTimeZone.tz(moment(multidayBeginDate).format(), timezone);
    const momentMultidayEndDate = momentTimeZone.tz(moment(multidayEndDate).format(), timezone);
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
    const { isPossibleNumber, isValidForRegion, isValidSmsType } = validatePhone(contactPhone, contactPhoneCountryData.iso2);
    let isValidPhoneNumber = true;
    let msg = "";
    if (!isPossibleNumber) {
      isValidPhoneNumber = false;
      msg = "invalid phone number";
    } else if (!isValidForRegion) {
      isValidPhoneNumber = false;
      msg = "invalid phone number for region";
    } else if (!isValidSmsType) {
      isValidPhoneNumber = false;
      msg = "invalid phone number for sms";
    }
    if (!isValidPhoneNumber) {
      return res.status(400).send({
        msg: msg,
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

  const sql = `
    SELECT
      churchid
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
      return res
        .status(500)
        .send({ msg: "unable to query for church id", msgType: "error", error: error });
    }
    if (!result.length) {
      return res.status(400).send({ msg: "invalid user", msgType: "error" });
    }

    const churchid = result[0].churchid;

    const sqlStartDate = startdate.length ? momentTimeZone.tz(moment(`${startdate} ${starttime}`).format(), timezone) : null;
    const sqlMultidayStart = multidayBeginDate.length ? momentTimeZone.tz(moment(`${multidayBeginDate} ${multidayBeginTime}`).format(), timezone) : null;
    const sqlMultidayEnd = multidayEndDate.length ? momentTimeZone.tz(moment(`${multidayEndDate} ${multidayEndTime}`).format(), timezone) : null;
    const sqlDates = {
      startdate: sqlStartDate,
      multidayStart: sqlMultidayStart,
      multidayEnd: sqlMultidayEnd
    };

    const sql = `
      SELECT
        eventid
      FROM
        events
      WHERE
        createdBy = ?
      AND
        churchid = ?
      AND
        type = ?
      AND
        title = ?
      AND
        startdate ${sqlDates.startdate === null ? "IS NULL" : "= ?"}
      AND
        multidaybegindate ${sqlDates.multidayStart === null ? "IS NULL" : "= ?"}
      AND
        multidayenddate ${sqlDates.multidayEnd === null ? "IS NULL" : "= ?"}
      LIMIT 1
      ;
    `;

    let sqlArray = [req.user.userid, churchid, eventtype, eventtitle];
    if (sqlDates.startdate !== null) sqlArray.push(sqlDates.startdate);
    if (sqlDates.multidayStart !== null) sqlArray.push(sqlDates.multidayStart);
    if (sqlDates.multidayEnd !== null) sqlArray.push(sqlDates.multidayEnd);

    db.query(sql, sqlArray, (error, result) => {
      if (error) {
        console.log(error);
        return res
          .status(500)
          .send({ msg: "unable to query for duplicate events", msgType: "error", error: error });
      }
      if (result.length) {
        return res.status(400).send({ msg: "duplicate event", msgType: "error", eventid: result[0].eventid });
      }

      const momentStartDateTime = momentTimeZone.tz(moment(`${startdate} ${starttime}`).format(), timezone);
      let sql = "";
      let sqlWeekday = parseInt(momentStartDateTime.format("d"));

      if (moment(startdate).isValid()) {
        switch (sqlWeekday) {
          case 0:
            sqlWeekday = 6;
            break;
          case 1:
            sqlWeekday = 0;
            break;
          case 2:
            sqlWeekday = 1;
            break;
          case 3:
            sqlWeekday = 2;
            break;
          case 4:
            sqlWeekday = 3;
            break;
          case 5:
            sqlWeekday = 4;
            break;
          case 6:
            sqlWeekday = 5;
            break;
        }
      }

      sql = `
        SELECT
          title
        FROM
          events
        WHERE
          createdBy = ?
        AND
          churchid = ?
        AND
          type = ?
        AND
          type <> 'other'
        AND
          frequency <> 'once'
        AND
          WEEKDAY(startdate) = ?
      `;
      if (frequency === "once") {
        sql += `WHERE
            eventid = 0
        `;
        sqlArray = [req.user.userid, churchid, eventtype, sqlWeekday];
      }
      sql += `
        LIMIT 1
        ;
      `;

      db.query(sql, sqlArray, (error, result) => {
        if (error) {
          console.log(error);
          return res
            .status(500)
            .send({ msg: "unable to query for overlapping recurring events", msgType: "error", error: error });
        }
        if (result.length) {
          return res.status(400).send({ msg: "overlapping recurring event", msgType: "error", title: result[0].title });
        }

        const sql = `
          INSERT INTO events(
            churchid,
            type,
            title,
            description,
            frequency,
            startdate,
            duration,
            durationInHours,
            multidayBeginDate,
            multidayEndDate,
            locationvisibility,
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
            lang,
            createdBy,
            createdAt
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            UTC_TIMESTAMP()
          );
        `;

        const sqlDuration = duration.trim().length ? duration.trim() : null;
        const sqlDurationInHours = (frequency !== "once") ? durationInHours : null;
        const sqlAddress = {
          line1: addressLine1.trim().length ? addressLine1.trim() : null,
          line2: addressLine2.trim().length ? addressLine2.trim() : null,
          line3: addressLine3.trim().length ? addressLine3.trim() : null,
          coordinates: (latitude.trim().length && longitude.trim().length) ? `POINT(${latitude.trim()},${longitude.trim()})` : null
        };
        const virtualDetails = attendVirtuallyConnectionDetails.trim().length > 0 ? attendVirtuallyConnectionDetails.trim() : null;
        const hasvirtual = attendVirtuallyConnectionDetails.trim().length ? 1 : 0;
        const sqlOtherLocationDetails = otherLocationDetails.trim().length ? otherLocationDetails.trim() : null;
        const contact = {
          firstname: contactFirstName.trim(),
          lastname: contactLastName.trim().length ? contactLastName.trim() : null,
          phone: contactPhone.trim().length ? contactPhone.trim() : null,
          phonedata: typeof contactPhoneCountryData === "object" ? JSON.stringify(contactPhoneCountryData) : null,
          email: contactEmail.trim().length ? contactEmail.trim().toLowerCase() : null
        };

        db.query(sql, [
          churchid,
          eventtype,
          eventtitle,
          eventdescription,
          frequency,
          sqlDates.startdate,
          sqlDuration,
          sqlDurationInHours,
          sqlDates.multidayStart,
          sqlDates.multidayEnd,
          locationvisibility,
          sqlAddress.line1,
          sqlAddress.line2,
          sqlAddress.line3,
          sqlAddress.coordinates,
          sqlOtherLocationDetails,
          virtualDetails,
          hasvirtual,
          contact.firstname,
          contact.lastname,
          contact.email,
          contact.phone,
          contact.phonedata,
          country,
          language,
          req.user.userid
        ], (error, result) => {
          if (error) {
            console.log(error);
            return res
              .status(500)
              .send({ msg: "unable to insert new event", msgType: "error", error: error });
          }
          return res.status(200).send({ msg: "event added", msgType: "success", id: result.insertId })
        });
      });
    });
  });
};
