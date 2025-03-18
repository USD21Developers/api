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

  // Params
  const unsyncedSettings = req.body.unsyncedSettings || null;

  // Ensure that custom invite text is no longer than 1000 characters
  if (unsyncedSettings && unsyncedSettings.hasOwnProperty("customInviteText")) {
    const maxCharacterQuantity = 1000;
    const truncatedText = unsyncedSettings.customInviteText.substring(
      0,
      maxCharacterQuantity
    );
    unsyncedSettings.customInviteText = truncatedText.trim();
  }

  // Validate customizing contact info in events by followed users
  if (
    unsyncedSettings &&
    unsyncedSettings.hasOwnProperty("eventsByFollowedUsers")
  ) {
    if (unsyncedSettings.eventsByFollowedUsers.hasOwnProperty("contactInfo")) {
      const { override, firstName, phone, phoneCountryData, email } =
        unsyncedSettings.eventsByFollowedUsers.contactInfo;

      const dontUseCustomContactInfo = () =>
        (unsyncedSettings.eventsByFollowedUsers.contactInfo.override = false);

      if (override) {
        if (!firstName.trim().length) {
          dontUseCustomContactInfo();
        }

        if (!phone.trim().length && !email.trim().length) {
          dontUseCustomContactInfo();
        }

        const emailValidator = require("email-validator");
        if (!emailValidator.validate(email)) {
          dontUseCustomContactInfo();
        }

        if (phone.trim().length) {
          if (!phoneCountryData) dontUseCustomContactInfo();
          if (!phoneCountryData.hasOwnProperty("iso2")) {
            const phoneValidationResults = require("./utils").validatePhone(
              phone,
              phoneCountryData.iso2
            );
            const {
              isPossibleNumber,
              isValidForRegion,
              isValidSmsType,
              e164Format,
            } = phoneValidationResults;
            if (!isPossibleNumber) dontUseCustomContactInfo();
            if (!isValidForRegion) dontUseCustomContactInfo();
            if (!e164Format) dontUseCustomContactInfo();
            // if (!isValidSmsType) dontUseCustomContactInfo();
          }
        }
      }
    }
  }

  const update = (db, unsyncedSettings) => {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE
          users
        SET
          settings = ?
        WHERE
          userid = ?
        ;
      `;

      const json = JSON.stringify(unsyncedSettings);

      db.query(sql, [json, req.user.userid], (error, result) => {
        if (error) {
          console.log(error);
          return reject(error);
        }

        return resolve(result[0]);
      });
    });
  };

  const getSettings = (db) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          settings
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

        return resolve(result[0]);
      });
    });
  };

  const getPushSubscriptions = (db) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          sha256hex,
          DATE_FORMAT(createdAt, '%Y-%m-%dT%H:%i:%sZ') AS createdAt,
          DATE_FORMAT(expirationTime, '%Y-%m-%dT%H:%i:%sZ') AS expirationTime
        FROM
          pushsubscriptions
        WHERE
          userid = ?
        ORDER BY
          createdAt DESC
        ;
      `;

      db.query(sql, [req.user.userid], (error, result) => {
        if (error) {
          console.log(error);
          return reject(error);
        }

        return resolve(result);
      });
    });
  };

  if (unsyncedSettings) {
    await update(db, unsyncedSettings);
  }

  const settingsPromise = getSettings(db);
  const pushSubscriptionsPromise = getPushSubscriptions(db);

  Promise.all([settingsPromise, pushSubscriptionsPromise]).then((results) => {
    const settings = JSON.parse(results[0].settings);
    const pushSubscriptions = results[1];

    return res.status(200).send({
      msg: "settings synced",
      msgType: "success",
      settings: settings,
      pushSubscriptions: pushSubscriptions,
    });
  });
};
