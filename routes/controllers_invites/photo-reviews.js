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
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Parameters
  const userIdsApproved = req.body.userIdsApproved;
  const userIdsFlagged = req.body.userIdsFlagged;
  const photosFlagged = req.body.photosFlagged;
  const htmlYourPhotoWasFlagged = req.body.htmlYourPhotoWasFlagged;
  const emailPhrasesPhotoWasFlagged = req.body.emailPhrasesPhotoWasFlagged;
  const adminTimeZone = req.body.adminTimeZone;

  // Variables
  const genericPhotoUrls = {
    male: "https://invites.mobi/_assets/img/profile-generic-male.png",
    female: "https://invites.mobi/_assets/img/profile-generic-female.png",
  };

  const notifyFlaggedUser = (
    db,
    user,
    htmlYourPhotoWasFlagged,
    emailPhrasesPhotoWasFlagged,
    adminTimeZone
  ) => {
    return new Promise((resolve, reject) => {
      const { userid, reason, other, gender } = user;
      const {
        emailP1,
        emailP2,
        emailP3,
        emailP4,
        emailP5,
        emailP6,
        emailP7,
        emailP8,
        emailUpdatePhotoLink,
        emailP10,
        emailSincerely,
        emailSubject,
        emailTheCyberministry,
        emailAboutApp,
        emailTimezone,
        emailMessageID,
        photoRules,
      } = emailPhrasesPhotoWasFlagged;
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
      const { document } = new JSDOM(htmlYourPhotoWasFlagged).window;
      const tempPhotoURL =
        gender === "female" ? genericPhotoUrls.female : genericPhotoUrls.male;
      const uuid = require("uuid");
      const messageID = uuid.v4();

      // TODO: query the DB to populate the userInfo object below, then continue

      sql = `
        SELECT
          u.firstname,
          u.lastname,
          u.profilephoto,
          pr.createdAt AS profilePhotoDate
        FROM
          users u
        INNER JOIN photoreview pr ON u.userid = pr.userid
        WHERE
          u.userid = ?
        LIMIT 1
        ;
      `;

      db.query(sql, [userid], (error, result) => {
        if (error) {
          console.log(error);
          return reject(error);
        }

        if (!result.length) {
          return reject(new Error("user not found"));
        }

        const userInfo = {
          firstName: result[0].firstname,
          lastName: result[0].lastname,
          profilephoto: result[0].profilephoto,
          profilePhotoDate: result[0].profilePhotoDate,
        };

        document.title = emailSubject;
        document.querySelector(
          "[data-i18n='profile-photo-was-flagged']"
        ).innerHTML = emailSubject;
        document.querySelector("[data-i18n='emailP1']").innerHTML =
          emailP1.replaceAll("{FIRST-NAME}", userInfo.firstName);
        document.querySelector("[data-i18n='emailP2']").innerHTML = emailP2;
        document.querySelector("[data-i18n='emailP3']").innerHTML = emailP3;
        document
          .querySelector("[data-i18n='emailP3']")
          .parentElement.querySelector("strong").innerHTML = reason;
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
        document.querySelector(
          "[data-i18n='ruleMustBeAppropriate']"
        ).innerHTML = ruleMustBeAppropriate;
        document.querySelector(
          "[data-i18n='explanationMustBeAppropriate']"
        ).innerHTML = explanationMustBeAppropriate;
        document.querySelector("[data-i18n='emailP4']").innerHTML = emailP4;
        document.querySelector("[data-i18n='emailP5']").innerHTML = emailP5;
        document
          .querySelector("#flaggedPhoto")
          .setAttribute("src", userInfo.profilephoto);
        document.querySelector("[data-i18n='addedOn']").innerHTML =
          photoAddedOn.replaceAll("{DATE}", userInfo.profilePhotoDate);
        document.querySelector("[data-i18n='emailP6']").innerHTML = emailP6;
        document.querySelector("[data-i18n='emailP7']").innerHTML = emailP7;
        document
          .querySelector("#temporaryPhoto")
          .setAttribute("src", tempPhotoURL);
        document.querySelector("[data-i18n='emailP8']").innerHTML = emailP8;
        document.querySelector("[data-i18n='emailUpdatePhotoLink']").innerHTML =
          emailUpdatePhotoLink;
        document.querySelector("[data-i18n='emailP10']").innerHTML = emailP10;
        document.querySelector("[data-i18n='emailSincerely']").innerHTML =
          emailSincerely;
        document.querySelector(
          "[data-i18n='emailTheCyberministry']"
        ).innerHTML = emailTheCyberministry;
        document.querySelector("[data-i18n='emailAboutApp']").innerHTML =
          emailAboutApp;
        document.querySelector("[data-i18n='emailTimezone']").innerHTML =
          emailTimezone.replaceAll("{ADMIN-TIMEZONE}", adminTimeZone);
        document.querySelector("[data-i18n='emailMessageID']").innerHTML =
          emailMessageID;
        document.querySelector("[data-var='messageID']").innerHTML = messageID;
      });

      const html = document.innerHTML;

      // TODO:  make sure that the "html" variable contains the full HTML document
      debugger;

      // TODO:  send e-mail

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

  const processFlags = (photosFlagged, userIdsFlagged) => {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(photosFlagged)) {
        return reject(new Error("photosFlagged must be an array"));
      }

      if (!photosFlagged.length || !userIdsFlagged.length) {
        return resolve();
      }

      const notificationPromises = [];

      photosFlagged.forEach((user) => {
        const notificationPromise = notifyFlaggedUser(
          db,
          user,
          htmlYourPhotoWasFlagged,
          emailPhrasesPhotoWasFlagged,
          adminTimeZone
        );
        notificationPromises.push(notificationPromise);
      });

      let caseProfilePhotoFlagged = "CASE ";
      let caseProfilePhoto = "CASE ";

      Promise.allSettled(notificationPromises).then((results) => {
        caseProfilePhotoFlagged += `WHEN userid = ${user.userid} THEN profilephoto `;
        caseProfilePhoto += `WHEN userid = ${user.userid} THEN 
          (CASE 
              WHEN gender = 'male' THEN '${genericPhotoUrls.male}' 
              WHEN gender = 'female' THEN '${genericPhotoUrls.female}' 
              ELSE profilephoto 
          END) `;
      });

      caseProfilePhotoFlagged += "END";
      caseProfilePhoto += "END";

      const sql = `
        UPDATE
          users
        SET
          profilephoto_flagged = ${caseProfilePhotoFlagged},
          profilephoto = ${caseProfilePhoto}
        WHERE
          userid IN (${userIdsFlagged.join(", ")})
        ;
      `;

      db.query(sql, [], (error, result) => {
        if (error) {
          console.log(error);
          return reject(error);
        }

        return resolve(result);
      });
    });
  };

  Promise.all(
    processApprovals(userIdsApproved),
    processFlags(photosFlagged, userIdsFlagged)
  ).then((results) => {
    // TODO:  e-mail user asking for revision to their photo (include both flagged and generic photo, flagged by user, reason for flagging, URL to revise photo)

    return res.status(200).send({
      msg: "photo reviews processed successfully",
      msgType: "success",
      results: results,
    });
  });
};
