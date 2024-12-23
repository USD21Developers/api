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

  /*
      TODO:  PLAN FOR PROCESSING FLAGGED USERS:

      1.  QUERY FOR ALL FLAGGED USERS.
          Within the "processedFlags" method, query all users whose userid matches.
          Select all data that will be needed for (A) flagging the user, and (B) notifying them.

      2.  UPDATE ALL FLAGGED USERS.
          Set each flagged user's profilephoto and profilephoto_flagged field according to flagged logic.

      3.  NOTIFY ALL FLAGGED USERS.
          Loop through the items in the returned SQL query.  Asynchronously call "notifyUser" to email them.
          Do not await!  Just fire off "notifyUser" for each flagged user asynchronously.

      4.  RESOLVE THE PROMISE.
          The promise can resolve, regardless of the outcome of notifying the users (step 2).

      5.  RESPOND TO THE CLIENT.
          The "Promise.allSettled" will fire (probably can be Promise.all).
          It's now safe to return a response to the client.
  */

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

  const notifyFlaggedUser = (flagObject) => {
    return new Promise((resolve, reject) => {
      const {
        userid,
        firstname,
        lastname,
        email,
        lang,
        gender,
        profilePhotoFlagged,
        profilePhotoDate,
        photoGeneric,
        reason,
        other,
      } = user;
      const profilePhotoDateFormatted = new Intl.DateTimeFormat(adminLocale, {
        timeZone: adminTimeZone,
        dateStyle: "full", // Can be 'full', 'long', 'medium', 'short'
        timeStyle: "short", // Optional: Can also be 'full', 'long', 'medium', 'short'
      }).format(new Date(profilePhotoDate));
      const actualReason = other.length ? other : reason;

      debugger;

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
      const { document } = new JSDOM(htmlYourPhotoWasFlagged).window;
      const tempPhotoURL =
        gender === "female" ? genericPhotoUrls.female : genericPhotoUrls.male;
      const uuid = require("uuid");
      const messageID = uuid.v4();

      document.title = emailSubject;
      document.querySelector(
        "[data-i18n='profile-photo-was-flagged']"
      ).innerHTML = emailSubject;
      document.querySelector("[data-i18n='emailP1']").innerHTML =
        emailP1.replaceAll("{FIRST-NAME}", firstname);
      document.querySelector("[data-i18n='emailP2']").innerHTML = emailP2;
      document.querySelector("[data-i18n='emailP3']").innerHTML = emailP3;
      document
        .querySelector("[data-i18n='emailP3']")
        .parentElement.querySelector("strong").innerHTML = actualReason;
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
      document.querySelector("[data-i18n='addedOn']").innerHTML =
        photoAddedOn.replaceAll("{DATE}", profilePhotoDateFormatted);
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
      document.querySelector("[data-i18n='emailTheCyberministry']").innerHTML =
        emailTheCyberministry;
      document.querySelector("[data-i18n='emailAboutApp']").innerHTML =
        emailAboutApp;
      document.querySelector("[data-i18n='emailTimezone']").innerHTML =
        emailTimezone.replaceAll("{ADMIN-TIMEZONE}", adminTimeZone);
      document.querySelector("[data-i18n='emailMessageID']").innerHTML =
        emailMessageID;
      document.querySelector("[data-var='messageID']").innerHTML = messageID;

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

  const processFlags = (photosFlagged) => {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(photosFlagged)) {
        return reject(new Error("photosFlagged must be an array"));
      }

      if (!photosFlagged.length || !userIdsFlagged.length) {
        return resolve();
      }

      const userIdsFlagged = photosFlagged.map((item) => item.userid);

      const sql = `
        SELECT
          u.userid,
          u.firstname,
          u.lastname,
          u.email,
          u.gender,
          u.profilephoto,
          pr.createdAt AS profilePhotoDate
        FROM
          users u
        INNER JOIN photoreview pr ON u.userid = pr.userid
        WHERE
          userid IN (?)
        LIMIT 1
        ;
      `;

      db.query(sql, [[userIdsFlagged]], (error, result) => {
        if (error) {
          return reject(error);
        }

        let caseProfilePhotoFlagged = "CASE ";
        let caseProfilePhoto = "CASE ";

        result.forEach((item) => {
          const {
            userid,
            firstname,
            lastname,
            email,
            gender,
            profilephoto,
            profilePhotoDate,
          } = item;
          const { reason, other } = photosFlagged.find(
            (photo) => (photo.userid = userid)
          );
          const genericPhotoUrl = `https://invites.mobi/_assets/img/profile-generic-${gender}.png`;

          const flagObject = {
            userid: userid,
            firstname: firstname,
            lastname: lastname,
            email: email,
            gender: gender,
            profilePhotoFlagged: profilephoto,
            profilePhotoDate: profilePhotoDate,
            photoGeneric: genericPhotoUrl,
            reason: reason,
            other: other,
          };

          notifyFlaggedUser(flagObject);

          caseProfilePhotoFlagged += `WHEN userid = ${userid} THEN profilephoto `;
          caseProfilePhoto += `WHEN userid = ${userid} THEN 
            (CASE 
                WHEN gender = 'male' THEN '${genericPhotoUrls.male}' 
                WHEN gender = 'female' THEN '${genericPhotoUrls.female}' 
                ELSE profilephoto 
            END) `;

          caseProfilePhotoFlagged += "END";
          caseProfilePhoto += "END";
        });

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

          return resolve();
        });
      });
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
