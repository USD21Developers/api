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
  const photosFlagged = req.body.photosFlagged;

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

      if (!photosFlagged.length) {
        return resolve();
      }

      // TODO:  change user's "profilephoto" field to a generic version, and store flagged photo in "profilephoto_flagged" field
      // TODO:  e-mail user asking for revision to their photo (include both flagged and generic photo, flagged by user, reason for flagging, URL to revise photo)
    });
  };

  Promise.all(
    processApprovals(userIdsApproved),
    processFlags(photosFlagged)
  ).then((results) => {
    return res.status(200).send({
      msg: "photo reviews processed successfully",
      msgType: "success",
      results: results,
    });
  });
};
