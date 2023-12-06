const moment = require("moment");

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
  const unsyncedFollowups = req.body.unsyncedFollowups || [];

  // Validate:  unsyncedFollowups must be an array
  if (!Array.isArray(unsyncedFollowups)) {
    return res.status(400).send({
      msg: "unsyncedFollowups must be an array",
      msgType: "error",
    });
  }

  // Function to update database with followup info
  const setFollowups = (invitationids, value) => {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(invitationids)) resolve();
      if (!invitationids.length) resolve();
      if (typeof value !== "number") reject();
      if (value !== 0 && value !== 1) reject();

      const ids = invitationids.join(",");
      const sql = `
        UPDATE
          invitations
        SET
          followup = ?
        WHERE
          invitationid IN (?)
        AND
          userid = ?
        ;
      `;
      db.query(sql, [value, ids, req.user.id], (error, result) => {
        if (error) {
          console.log(error);
          reject();
        }
        resolve();
      });
    });
  };

  // Set a promise array to store promises for all DB queries
  const promiseArray = [];

  // Process unsynced followups
  const followup0 = unsyncedFollowups.filter((item) => item.followup === 0);
  const followup1 = unsyncedFollowups.filter((item) => item.followup === 1);
  if (followup0.length) {
    const promise = setFollowups(followup0, 0);
    promiseArray.push(promise);
  }
  if (followup1.length) {
    const promise = setFollowups(followup1, 1);
    promiseArray.push(promise);
  }

  // Wait for all promises to resolve, then return out
  Promise.allSettled(promiseArray, () => {
    return res.status(200).send({
      msg: "updated invites synced",
      msgType: "success",
    });
  });
};
