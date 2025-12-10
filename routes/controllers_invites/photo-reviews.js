exports.POST = (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["sysadmin"];
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

  // Parameters
  const userIdsApproved = req.body.userIdsApproved;
  const photosFlagged = req.body.photosFlagged;
  const htmlYourPhotoWasFlagged = req.body.htmlYourPhotoWasFlagged;
  const emailPhrasesPhotoWasFlagged = req.body.emailPhrasesPhotoWasFlagged;
  const adminTimeZone = req.body.adminTimeZone;

  // Variables
  const genericPhotoUrls = {
    male: "https://invites.mobi/_assets/img/profile-generic-male.png",
    female: "https://invites.mobi/_assets/img/profile-generic-female.png",
  };

  let updateProfilePhotoURL = "https://invites.mobi/profile/photo/";
  if (isLocal) {
    updateProfilePhotoURL = "http://localhost:5555/profile/photo/";
  } else if (isStaging) {
    updateProfilePhotoURL = "https://staging.invites.mobi/profile/photo/";
  }

  const notifyFlaggedUser = (flag) => {
    return new Promise(async (resolve, reject) => {
      const {
        userid,
        firstname,
        lastname,
        email,
        lang,
        country,
        gender,
        profilePhotoFlagged,
        profilePhotoDate,
        photoGeneric,
        reason,
        other,
      } = flag;
      const userLocale = `${lang.toLowerCase()}-${country.toUpperCase()}`;
      const utcDateNow = new Date().toISOString();
      const dateNow = new Intl.DateTimeFormat(userLocale, {
        timeZone: adminTimeZone,
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(utcDateNow));
      const profilePhotoDateFormatted = new Intl.DateTimeFormat(userLocale, {
        timeZone: adminTimeZone,
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(profilePhotoDate));
      const actualReason = other.length ? other : reason;

      const {
        emailP1,
        emailP2,
        dateUploadedLabel,
        dateFlaggedLabel,
        emailP3,
        emailP4,
        emailP5,
        emailP6,
        emailP7,
        emailP8,
        emailP9,
        emailUpdatePhotoLink,
        emailP10,
        emailSincerely,
        emailSubject,
        emailTheCyberministry,
        emailAboutApp,
        emailTimezone,
        emailMessageID,
        photoRules,
      } = emailPhrasesPhotoWasFlagged[lang];

      const {
        headlineRulesAboutPhotos,
        ruleMustShowYourFace,
        explanationMustShowYourFace,
        ruleFaceMustBeProminent,
        explanationFaceMustBeProminent,
        ruleOnlyYou,
        explanationOnlyYou,
        ruleMustBeAppropriate,
        explanationMustBeAppropriate,
      } = photoRules;

      const jsdom = require("jsdom");
      const { JSDOM } = jsdom;
      const dom = new JSDOM(htmlYourPhotoWasFlagged);
      const { document } = dom.window;
      const uuid = require("uuid");
      const messageID = uuid.v4();

      document.querySelector("html").setAttribute("lang", lang);
      document.title = emailSubject;
      document.querySelector("[data-i18n='emailP1']").innerHTML =
        emailP1.replaceAll("{FIRST-NAME}", firstname);
      document.querySelector("[data-i18n='emailP2']").innerHTML = emailP2;
      document.querySelector("[data-i18n='dateUploadedLabel']").innerHTML =
        dateUploadedLabel;
      document.querySelector("#dateUploaded").innerHTML =
        profilePhotoDateFormatted;
      document.querySelector("[data-i18n='dateFlaggedLabel']").innerHTML =
        dateFlaggedLabel;
      document.querySelector("#dateFlagged").innerHTML = dateNow;
      document.querySelector("[data-i18n='emailP3']").innerHTML = emailP3;
      document.querySelector("#actualReason").innerHTML = actualReason;
      document.querySelector(
        "[data-i18n='headlineRulesAboutPhotos']"
      ).innerHTML = headlineRulesAboutPhotos;
      document.querySelector("[data-i18n='ruleMustShowYourFace']").innerHTML =
        ruleMustShowYourFace;
      document.querySelector(
        "[data-i18n='explanationMustShowYourFace']"
      ).innerHTML = explanationMustShowYourFace;
      document.querySelector(
        "[data-i18n='ruleFaceMustBeProminent']"
      ).innerHTML = ruleFaceMustBeProminent;
      document.querySelector(
        "[data-i18n='explanationFaceMustBeProminent']"
      ).innerHTML = explanationFaceMustBeProminent;
      document.querySelector("[data-i18n='ruleOnlyYou']").innerHTML =
        ruleOnlyYou;
      document.querySelector("[data-i18n='explanationOnlyYou']").innerHTML =
        explanationOnlyYou;
      document.querySelector("[data-i18n='ruleMustBeAppropriate']").innerHTML =
        ruleMustBeAppropriate;
      document.querySelector(
        "[data-i18n='explanationMustBeAppropriate']"
      ).innerHTML = explanationMustBeAppropriate;
      document.querySelector("[data-i18n='emailP4']").innerHTML = emailP4;
      document.querySelector("[data-i18n='emailP5']").innerHTML = emailP5;
      document
        .querySelector("#flaggedPhoto")
        .setAttribute("src", profilePhotoFlagged);
      document.querySelector("[data-i18n='emailP6']").innerHTML =
        emailP6.replaceAll("{DATE}", profilePhotoDateFormatted);
      document.querySelector("[data-i18n='emailP7']").innerHTML = emailP7;
      document.querySelector("[data-i18n='emailP8']").innerHTML = emailP8;
      document
        .querySelector("#temporaryPhoto")
        .setAttribute("src", photoGeneric);
      document.querySelector("[data-i18n='emailP9']").innerHTML = emailP9;
      document.querySelector("[data-i18n='emailUpdatePhotoLink']").innerHTML =
        emailUpdatePhotoLink;
      document
        .querySelector("[data-i18n='emailUpdatePhotoLink']")
        .setAttribute("href", updateProfilePhotoURL);
      document.querySelector("[data-i18n='emailP10']").innerHTML = emailP10;
      document.querySelector("[data-i18n='emailSincerely']").innerHTML =
        emailSincerely;
      document.querySelector("[data-i18n='emailTheCyberministry']").innerHTML =
        emailTheCyberministry;
      document.querySelector("[data-i18n='emailAboutApp']").innerHTML =
        emailAboutApp;
      document.querySelector("[data-i18n='emailTimezone']").innerHTML =
        emailTimezone.replaceAll("{ADMIN-TIMEZONE}", adminTimeZone);
      document.querySelector("[data-i18n='emailMessageID']").innerHTML =
        emailMessageID;
      document.querySelector("[data-var='messageID']").innerHTML = messageID;

      const html = dom.serialize();

      const emailRecipient = `${firstname} ${lastname} <${email}>`;
      const emailSender = "invites.mobi";

      const emailResult = await require("./utils").sendEmail(
        `${firstname} ${lastname}`,
        email,
        emailSender,
        emailSubject,
        html
      );

      // TODO:  replace the following resolve() depending on the actual result
      return resolve();
    });
  };

  const processApprovals = (userids) => {
    return new Promise((resolve, reject) => {
      const sql = `
        DELETE FROM photoreview
        WHERE userid IN ?
        ;
      `;

      if (!Array.isArray) {
        return reject(new Error("userids must be an array"));
      }

      if (!userids.length) {
        return resolve();
      }

      db.query(sql, [[userids]], (error, result) => {
        if (error) {
          console.log(error);
          return reject(error);
        }

        return resolve(result);
      });
    });
  };

  const processFlag = (db, flag) => {
    return new Promise((resolve, reject) => {
      const userid = flag.userid;

      const sql = `
        SELECT
          u.userid,
          u.firstname,
          u.lastname,
          u.email,
          u.lang,
          u.gender,
          u.profilephoto,
          u.profilephoto_flagged,
          pr.createdAt AS profilePhotoDate,
          c.country
        FROM
          users u
        INNER JOIN photoreview pr ON pr.userid = u.userid
        INNER JOIN churches c ON u.churchid = c.remoteid
        WHERE
          u.userid = ?
        LIMIT 1
        ;
      `;

      db.query(sql, [userid], (error, result) => {
        if (error) {
          return reject(error);
        }

        if (!result.length) {
          return reject(new Error("user not found"));
        }

        const {
          userid,
          firstname,
          lastname,
          email,
          lang,
          gender,
          profilephoto,
          profilephoto_flagged,
          profilePhotoDate,
          country,
        } = result[0];

        const photoGeneric =
          gender === "female" ? genericPhotoUrls.female : genericPhotoUrls.male;

        let profilePhotoFlagged = profilephoto;

        const profilePhotoIsAlreadyFlagged =
          profilephoto.indexOf("profile-generic") >= 0;

        if (profilePhotoIsAlreadyFlagged) {
          profilePhotoFlagged = profilephoto_flagged;
        }

        const flagObject = {
          userid: userid,
          firstname: firstname,
          lastname: lastname,
          email: email,
          lang: lang,
          country: country,
          gender: gender,
          profilePhotoFlagged: profilePhotoFlagged,
          profilePhotoDate: profilePhotoDate,
          photoGeneric: photoGeneric,
          reason: flag.reason,
          other: flag.other,
        };

        const isUsingFlaggedPhoto = profilephoto.indexOf("__400.jpg" >= 0)
          ? true
          : false;

        const sql = `
          UPDATE
            users
          SET
            profilephoto = ?,
            profilephoto_flagged = ?
          WHERE
            userid = ?
          ;
        `;

        let sqlParams;

        if (isUsingFlaggedPhoto) {
          sqlParams = [photoGeneric, profilephoto, userid];
        } else {
          sqlParams = [photoGeneric, profilephoto_flagged, userid];
        }

        db.query(sql, sqlParams, (error, result) => {
          if (error) {
            console.log(
              `Could not set user's flagged profile photo to a generic version (userid ${userid})`
            );
            return reject(error);
          }

          notifyFlaggedUser(flagObject);

          const sql = `
            DELETE FROM
              photoreview
            WHERE
              userid = ?
            ;
          `;

          db.query(sql, [userid], (error, result) => {
            if (error) {
              console.log(error);
              return reject(error);
            }

            return resolve();
          });
        });
      });
    });
  };

  const processFlags = (photosFlagged) => {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(photosFlagged)) {
        return reject(new Error("photosFlagged must be an array"));
      }

      if (!photosFlagged.length) {
        return resolve();
      }

      photosFlagged.map((flag) => processFlag(db, flag));

      return resolve();
    });
  };

  const processedApprovals = processApprovals(userIdsApproved);
  const processedFlags = processFlags(photosFlagged);

  Promise.allSettled([processedApprovals, processedFlags]).then((results) => {
    return res.status(200).send({
      msg: "photo reviews processed successfully",
      msgType: "success",
      results: results,
    });
  });
};
