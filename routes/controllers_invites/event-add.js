const moment = require("moment-timezone");
const emailValidator = require("email-validator");

exports.POST = (req, res) => {
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

  // Get request params
  const language = req.body.language || "";
  const eventtype = req.body.eventtype || "";
  const eventtitle = req.body.eventtitle || "";
  const descriptionheadline = req.body.descriptionHeadline || "";
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
  const offset = req.body.offset || "";
  const locationvisibility = req.body.locationvisibility || "";
  const locationname = req.body.locationname || "";
  const addressLine1 = req.body.addressLine1 || "";
  const addressLine2 = req.body.addressLine2 || "";
  const addressLine3 = req.body.addressLine3 || "";
  const country = req.body.country || "";
  const latitude = req.body.latitude || "";
  const longitude = req.body.longitude || "";
  const otherLocationDetails = req.body.otherLocationDetails || "";
  const attendVirtuallyConnectionDetails =
    req.body.attendVirtuallyConnectionDetails || "";
  const shareWithFollowers = req.body.shareWithFollowers || "";
  const contactFirstName = req.body.contactFirstName || "";
  const contactLastName = req.body.contactLastName || "";
  const contactPhone = req.body.contactPhone || "";
  const contactPhoneFormatted = req.body.contactPhoneFormatted || "";
  const contactPhoneCountryData = req.body.contactPhoneCountryData || "";
  const contactEmail = req.body.contactEmail || "";

  // VALIDATE

  const momentNow = moment().tz(timezone);

  const momentNowUtc = moment().tz("utc");

  // language
  if (language.trim().length !== 2) {
    return res.status(400).send({
      msg: "language is required",
      msgType: "error",
    });
  }

  // event type
  const validEventTypes = ["bible talk", "church", "other"];
  if (!validEventTypes.includes(eventtype)) {
    return res.status(400).send({
      msg: "a valid event type is required",
      msgType: "error",
    });
  }

  // event title
  if (!eventtitle.trim().length) {
    return res.status(400).send({
      msg: "event title is required",
      msgType: "error",
    });
  }

  // event description headline
  if (!descriptionheadline.trim().length) {
    return res.status(400).send({
      msg: "event description headline is required",
      msgType: "error",
    });
  }

  // event description
  if (!eventdescription.trim().length) {
    return res.status(400).send({
      msg: "event description is required",
      msgType: "error",
    });
  }

  // frequency
  const validEventFrequencies = [
    "once",
    "Every Sunday",
    "Every Monday",
    "Every Tuesday",
    "Every Wednesday",
    "Every Thursday",
    "Every Friday",
    "Every Saturday",
  ];
  if (!validEventFrequencies.includes(frequency)) {
    return res.status(400).send({
      msg: "a valid event frequency is required",
      msgType: "error",
    });
  }

  // duration (in days)
  const validDurations = ["", "same day", "multiple days"];
  let durationIsValid = true;
  if (!validDurations.includes(duration)) {
    durationIsValid = false;
  }
  if (duration === "" && frequency === "once") {
    durationIsValid = false;
  }
  if (!durationIsValid) {
    return res.status(400).send({
      msg: "a valid duration (in days) is required",
      msgType: "error",
    });
  }

  // duration (in hours)
  const durationInHoursRequired = duration === "multiple days" ? false : true;
  if (durationInHoursRequired) {
    if (typeof durationInHours === "") {
      return res.status(400).send({
        msg: "duration (in hours) is required",
        msgType: "error",
      });
    }
    if (typeof durationInHours !== "number") {
      return res.status(400).send({
        msg: "duration (in hours) must be a number",
        msgType: "error",
      });
    }
    if (durationInHours < 0.5 || durationInHours > 8) {
      return res.status(400).send({
        msg: "duration (in hours) must be between 0.5 and 8 hours",
        msgType: "error",
      });
    }
  }
  if (duration === "multiple days") durationInHours = "";

  // time zone
  if (!timezone.length) {
    return res.status(400).send({
      msg: "time zone is required",
      msgType: "error",
    });
  }

  // time zone
  if (!offset.length) {
    return res.status(400).send({
      msg: "time zone offset is required",
      msgType: "error",
    });
  }

  // start date (not multiday)
  if (duration !== "multiple days") {
    if (startdate.trim().length === 0) {
      return res.status(400).send({
        msg: "startdate is required",
        msgType: "error",
      });
    }

    const isValidDate = moment
      .tz(moment(startdate).format(), timezone)
      .isValid();
    if (!isValidDate) {
      return res.status(400).send({
        msg: "a valid startdate is required",
        msgType: "error",
      });
    }

    // start time
    if (starttime.trim().length === 0) {
      return res.status(400).send({
        msg: "starttime is required",
        msgType: "error",
      });
    }

    // recurring weekday must match next occurence weekday
    if (frequency !== "once") {
      const nextOccuranceWeekday = moment
        .tz(`${startdate} ${starttime}`, timezone)
        .format("dddd");
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
          msgType: "error",
        });
      }
    }

    const momentStartDateTime = moment.tz(
      moment(`${startdate} ${starttime}`).format(),
      timezone
    );

    const momentStartDateTimeUtc = moment.tz(
      moment.tz(`${startdate} ${starttime}`, timezone).format(),
      "utc"
    );

    const isValidDateTime = momentStartDateTime.isValid();

    if (!isValidDateTime) {
      return res.status(400).send({
        msg: "a valid starttime is required",
        msgType: "error",
      });
    }

    const isInThePast = momentNow.isAfter(momentStartDateTime) ? true : false;

    const isInThePastUtc = momentNowUtc.isAfter(momentStartDateTimeUtc)
      ? true
      : false;

    if (isInThePastUtc) {
      return res.status(400).send({
        msg: "startdate and starttime must not be in the past",
        msgType: "error",
      });
    }
  }

  // multiday
  if (duration === "multiple days") {
    // multiday begin date
    if (multidayBeginDate.trim().length === 0) {
      return res.status(400).send({
        msg: "multidayBeginDate is required",
        msgType: "error",
      });
    }

    const isValidMultidayBeginDate = moment
      .tz(multidayBeginDate, timezone)
      .isValid();
    if (!isValidMultidayBeginDate) {
      return res.status(400).send({
        msg: "a valid multidayBeginDate is required",
        msgType: "error",
      });
    }

    // multiday begin time
    if (multidayBeginTime.trim().length === 0) {
      return res.status(400).send({
        msg: "multidayBeginTime is required",
        msgType: "error",
      });
    }

    const momentMultidayStartDateTime = moment.tz(
      moment(`${multidayBeginDate} ${multidayBeginTime}`).format(),
      timezone
    );

    const momentMultidayStartDateTimeUtc = moment.tz(
      moment.tz(`${multidayBeginDate} ${multidayBeginTime}`, timezone).format(),
      "utc"
    );

    const isValidMultidayStartDateTime = momentMultidayStartDateTime.isValid();

    if (!isValidMultidayStartDateTime) {
      return res.status(400).send({
        msg: "a valid multidayBeginTime is required",
        msgType: "error",
      });
    }

    const multidayStartDateIsInThePast = momentNow.isAfter(
      momentMultidayStartDateTime
    )
      ? true
      : false;

    const multidayStartDateIsInThePastUtc = momentNowUtc.isAfter(
      momentMultidayStartDateTimeUtc
    )
      ? true
      : false;

    if (multidayStartDateIsInThePastUtc) {
      return res.status(400).send({
        msg: "multidayBeginDate and multidayBeginTime must not be in the past",
        msgType: "error",
      });
    }

    // multiday end date
    if (multidayEndDate.trim().length === 0) {
      return res.status(400).send({
        msg: "multidayEndDate is required",
        msgType: "error",
      });
    }

    const isValidMultidayEndDate = moment
      .tz(moment(multidayEndDate).format(), timezone)
      .isValid();
    if (!isValidMultidayEndDate) {
      return res.status(400).send({
        msg: "a valid multidayEndDate is required",
        msgType: "error",
      });
    }

    // multiday end time
    if (multidayEndTime.trim().length === 0) {
      return res.status(400).send({
        msg: "multidayEndTime is required",
        msgType: "error",
      });
    }

    const momentMultidayEndDateTime = moment.tz(
      moment(`${multidayEndDate} ${multidayEndTime}`).format(),
      timezone
    );

    const momentMultidayEndDateTimeUtc = moment.tz(
      moment.tz(`${multidayEndDate} ${multidayEndTime}`, timezone).format(),
      "utc"
    );

    const isValidMultidayEndDateTime = momentMultidayEndDateTime.isValid();

    if (!isValidMultidayEndDateTime) {
      return res.status(400).send({
        msg: "a valid multidayEndTime is required",
        msgType: "error",
      });
    }

    const multidayEndDateIsInThePast = momentNow.isAfter(
      momentMultidayEndDateTime
    )
      ? true
      : false;

    const multidayEndDateIsInThePastUtc = momentNowUtc.isAfter(
      momentMultidayEndDateTimeUtc
    )
      ? true
      : false;

    if (multidayEndDateIsInThePastUtc) {
      return res.status(400).send({
        msg: "multidayEndDate and multidayEndTime must not be in the past",
        msgType: "error",
      });
    }

    if (momentMultidayStartDateTime.isAfter(momentMultidayEndDateTime)) {
      return res.status(400).send({
        msg: "multidayBeginDate and multidayBeginTime must come before multidayEndDate and multidayEndTime",
        msgType: "error",
      });
    }

    const momentMultidayBeginDate = moment.tz(
      moment(multidayBeginDate).format(),
      timezone
    );
    const momentMultidayEndDate = moment.tz(
      moment(multidayEndDate).format(),
      timezone
    );
    if (momentMultidayBeginDate.isSame(momentMultidayEndDate)) {
      return res.status(400).send({
        msg: "multidayBeginDate and multidayEndDate must not be on the same day",
        msgType: "error",
      });
    }
  }

  // country
  if (country === "") {
    return res.status(400).send({
      msg: "country is required",
      msgType: "error",
    });
  }

  // Addresses must constitute at least 2 lines (unless in Japan, or unless coordinates supplied)
  let numAddressLines = 0;
  const line1Populated = addressLine1.length > 0;
  const line2Populated = addressLine2.length > 0;
  const line3Populated = addressLine3.length > 0;
  const latPopulated = latitude.length > 0;
  const longPopulated = longitude.length > 0;
  const isJapan = country === "jp";

  if (line1Populated) numAddressLines += 1;
  if (line2Populated) numAddressLines += 1;
  if (line3Populated) numAddressLines += 1;

  // If only one address line populated
  if (numAddressLines === 1 && !isJapan) {
    return res.status(400).send({
      msg: "event address must have at least 2 lines",
      msgType: "error",
    });
  }

  // If only one coordinate is populated
  const oneCoordinateSupplied = latPopulated || longPopulated;
  const bothCoordinatesSupplied = latPopulated && longPopulated;
  if (oneCoordinateSupplied && !bothCoordinatesSupplied) {
    return res.status(400).send({
      msg: "both coordinates are required",
      msgType: "error",
    });
  }

  // If neither address nor coordinates were populated
  if (!latPopulated && !longPopulated && numAddressLines === 0) {
    return res.status(400).send({
      msg: "either an address or coordinates are required",
      msgType: "error",
    });
  }

  if (!contactFirstName.length) {
    return res.status(400).send({
      msg: "first name is required for contact person",
      msgType: "error",
    });
  }

  if (!contactPhone.length && !contactEmail.length) {
    return res.status(400).send({
      msg: "at least one method of contact is required",
      msgType: "error",
    });
  }

  if (contactPhone.length) {
    const validatePhone = require("./utils").validatePhone;
    const { isPossibleNumber, isValidForRegion, isValidSmsType } =
      validatePhone(contactPhone, contactPhoneCountryData.iso2);
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
        msgType: "error",
      });
    }
  }

  if (contactEmail.length) {
    const isValidEmail = emailValidator.validate(contactEmail);
    if (!isValidEmail) {
      return res.status(400).send({
        msg: "invalid email",
        msgType: "error",
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

  db.query(sql, [req.user.userid], async (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).send({
        msg: "unable to query for church id",
        msgType: "error",
        error: error,
      });
    }
    if (!result.length) {
      return res.status(400).send({ msg: "invalid user", msgType: "error" });
    }

    const churchid = result[0].churchid;

    const sqlAddress = {
      line1: addressLine1.trim().length ? addressLine1.trim() : null,
      line2: addressLine2.trim().length ? addressLine2.trim() : null,
      line3: addressLine3.trim().length ? addressLine3.trim() : null,
      coordinates:
        latitude.trim().length && longitude.trim().length
          ? `POINT(${longitude.trim()} ${latitude.trim()})`
          : null,
    };

    // If no coordinates passed from the form, then geocode the address
    if (!sqlAddress.coordinates) {
      const getAddressCoordinates = require("./utils").getAddressCoordinates;
      const geocodedAddress = await getAddressCoordinates(db, {
        line1: sqlAddress.line1,
        line2: sqlAddress.line2,
        line3: sqlAddress.line3,
        country: country,
      }).catch((err) => {
        console.log(err);
        return "";
      });

      if (typeof geocodedAddress === "object") {
        const { lat, lng } = geocodedAddress;
        if (typeof lat === "number" && typeof lng === "number") {
          sqlAddress.coordinates = `POINT(${lng} ${lat})`;
        } else {
          sqlAddress.coordinates = null;
        }
      }
    }

    const sqlDuration = duration.trim().length ? duration.trim() : null;
    const sqlDurationInHours =
      typeof durationInHours === "number" ? durationInHours : null;
    const virtualDetails =
      attendVirtuallyConnectionDetails.trim().length > 0
        ? attendVirtuallyConnectionDetails.trim()
        : null;
    const hasvirtual = attendVirtuallyConnectionDetails.trim().length ? 1 : 0;
    const sqlOtherLocationDetails = otherLocationDetails.trim().length
      ? otherLocationDetails.trim()
      : null;
    const contact = {
      firstname: contactFirstName.trim(),
      lastname: contactLastName.trim().length ? contactLastName.trim() : null,
      phone: contactPhone.trim().length ? contactPhone.trim() : null,
      phonedata:
        contactPhone.trim().length &&
        typeof contactPhoneCountryData === "object"
          ? JSON.stringify(contactPhoneCountryData)
          : null,
      email: contactEmail.trim().length
        ? contactEmail.trim().toLowerCase()
        : null,
    };

    const sqlInsertRecord = `
        INSERT INTO events(
          churchid,
          type,
          title,
          descriptionHeading,
          description,
          frequency,
          timezone,
          startdate,
          duration,
          durationInHours,
          multidayBeginDate,
          multidayEndDate,
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
          createdBy,
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
          ?,
          ?, 
          ?, 
          ?, 
          ?, 
          ?, 
          ?, 
          ?,
          ST_GeomFromText( ? ), 
          ?, 
          ?, 
          ?, 
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

    if (duration === "multiple days") {
      /********************/
      /*  BEGIN MULTIDAY  */
      /********************/
      const sqlStartDate = null;
      const sqlMultidayStart = moment
        .tz(`${multidayBeginDate} ${multidayBeginTime}`, timezone)
        .utc()
        .format("YYYY-MM-DD HH:mm");
      const sqlMultidayEnd = moment
        .tz(`${multidayEndDate} ${multidayEndTime}`, timezone)
        .utc()
        .format("YYYY-MM-DD HH:mm");
      const sqlDates = {
        startdate: sqlStartDate,
        multidayStart: sqlMultidayStart,
        multidayEnd: sqlMultidayEnd,
      };

      db.query(
        sqlInsertRecord,
        [
          churchid,
          eventtype,
          eventtitle,
          descriptionheadline,
          eventdescription,
          frequency,
          timezone,
          sqlDates.startdate,
          sqlDuration,
          sqlDurationInHours,
          sqlDates.multidayStart,
          sqlDates.multidayEnd,
          locationvisibility,
          locationname,
          sqlAddress.line1,
          sqlAddress.line2,
          sqlAddress.line3,
          sqlAddress.coordinates,
          sqlOtherLocationDetails,
          virtualDetails,
          hasvirtual,
          shareWithFollowers,
          contact.firstname,
          contact.lastname,
          contact.email,
          contact.phone,
          contact.phonedata,
          country,
          language,
          req.user.userid,
        ],
        (error, result) => {
          if (error) {
            console.log(error);
            return res.status(500).send({
              msg: "unable to insert new event",
              msgType: "error",
              error: error,
            });
          }

          const newEvent = {
            eventid: result.insertId,
          };

          return res.status(200).send({
            msg: "event added",
            msgType: "success",
            newEvent: newEvent,
          });
        }
      );
      /********************/
      /*  END MULTIDAY  */
      /********************/
    } else if (frequency === "once") {
      /************************************/
      /*  BEGIN SINGLE DAY NON-RECURRING  */
      /************************************/

      const sqlStartDate = moment
        .tz(`${startdate} ${starttime}`, timezone)
        .utc()
        .format("YYYY-MM-DD HH:mm");
      const sqlMultidayStart = null;
      const sqlMultidayEnd = null;
      const sqlDates = {
        startdate: sqlStartDate,
        multidayStart: sqlMultidayStart,
        multidayEnd: sqlMultidayEnd,
      };

      db.query(
        sqlInsertRecord,
        [
          churchid,
          eventtype,
          eventtitle,
          descriptionheadline,
          eventdescription,
          frequency,
          timezone,
          sqlDates.startdate,
          sqlDuration,
          sqlDurationInHours,
          sqlDates.multidayStart,
          sqlDates.multidayEnd,
          locationvisibility,
          locationname,
          sqlAddress.line1,
          sqlAddress.line2,
          sqlAddress.line3,
          sqlAddress.coordinates,
          sqlOtherLocationDetails,
          virtualDetails,
          hasvirtual,
          shareWithFollowers,
          contact.firstname,
          contact.lastname,
          contact.email,
          contact.phone,
          contact.phonedata,
          country,
          language,
          req.user.userid,
        ],
        (error, result) => {
          if (error) {
            console.log(error);
            return res.status(500).send({
              msg: "unable to insert new event",
              msgType: "error",
              error: error,
            });
          }

          const newEvent = {
            eventid: result.insertId,
          };

          return res.status(200).send({
            msg: "event added",
            msgType: "success",
            newEvent: newEvent,
          });
        }
      );

      /**********************************/
      /*  END SINGLE DAY NON-RECURRING  */
      /**********************************/
    } else {
      /*********************/
      /*  BEGIN RECURRING  */
      /*********************/

      const sqlStartDate = moment
        .tz(`${startdate} ${starttime}`, timezone)
        .utc()
        .format("YYYY-MM-DD HH:mm");
      const sqlMultidayStart = null;
      const sqlMultidayEnd = null;
      const sqlDates = {
        startdate: sqlStartDate,
        multidayStart: sqlMultidayStart,
        multidayEnd: sqlMultidayEnd,
      };

      const momentStartDateTime = moment.tz(
        moment(`${startdate} ${starttime}`).format(),
        timezone
      );
      let sql = "";
      let sqlWeekday = parseInt(momentStartDateTime.format("d"));

      if (moment(momentStartDateTime).isValid()) {
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

      db.query(
        sqlInsertRecord,
        [
          churchid,
          eventtype,
          eventtitle,
          descriptionheadline,
          eventdescription,
          frequency,
          timezone,
          sqlDates.startdate,
          sqlDuration,
          sqlDurationInHours,
          sqlDates.multidayStart,
          sqlDates.multidayEnd,
          locationvisibility,
          locationname,
          sqlAddress.line1,
          sqlAddress.line2,
          sqlAddress.line3,
          sqlAddress.coordinates,
          sqlOtherLocationDetails,
          virtualDetails,
          hasvirtual,
          shareWithFollowers,
          contact.firstname,
          contact.lastname,
          contact.email,
          contact.phone,
          contact.phonedata,
          country,
          language,
          req.user.userid,
        ],
        async (error, result) => {
          if (error) {
            console.log(error);
            return res.status(500).send({
              msg: "unable to insert new event",
              msgType: "error",
              error: error,
            });
          }

          const getEventsByUser =
            require("../controllers_invites/utils").getEventsByUser;
          const events = await getEventsByUser(
            db,
            req.user.userid,
            req.user.userid
          ).catch((error) => {
            console.log(error);
            return res.status(500).send({
              msg: "unable to return events",
              msgType: "error",
            });
          });

          return res.status(200).send({
            msg: "event added",
            msgType: "success",
            events: events,
          });
        }
      );

      /*******************/
      /*  END RECURRING  */
      /*******************/
    }
  });
};
