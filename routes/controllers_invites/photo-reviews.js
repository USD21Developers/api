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

  // Variables
  const genericPhotoUrls = {
    male: "https://invites.mobi/_assets/img/profile-generic-male.png",
    female: "https://invites.mobi/_assets/img/profile-generic-female.png",
  };

  const notifyFlaggedUser = (user) => {
    return new Promise((resolve, reject) => {
      const { userid, reason, other, gender } = user;
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

      let caseProfilePhotoFlagged = "CASE ";
      let caseProfilePhoto = "CASE ";

      photosFlagged.forEach((user) => {
        notifyFlaggedUser(user);

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
