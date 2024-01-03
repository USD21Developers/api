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
  const unsyncedInviteNotifications =
    req.body.unsyncedInviteNotifications || [];

  // Validate:  unsyncedFollowups must be an array
  if (!Array.isArray(unsyncedInviteNotifications)) {
    return res.status(400).send({
      msg: "unsyncedInviteNotifications must be an array",
      msgType: "error",
    });
  }

  // Function to update database with notifications settings
  function updateNotificationSettings(settingsObj) {
    return new Promise((resolve, reject) => {
      const {
        invitationid,
        unsubscribedFromEmail,
        unsubscribedFromEmailAt,
        unsubscribedFromPush,
        unsubscribedFromPushAt,
      } = settingsObj;

      const sql = `
        UPDATE
          invitations
        SET
          unsubscribedFromEmail = ?,
          unsubscribedFromEmailAt = STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ'),
          unsubscribedFromPush = ?,
          unsubscribedFromPushAt = STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s.%fZ')
        WHERE
          invitationid = ?
        AND
          userid = ?
        ;
      `;

      db.query(
        sql,
        [
          unsubscribedFromEmail,
          unsubscribedFromEmailAt,
          unsubscribedFromPush,
          unsubscribedFromPushAt,
          invitationid,
          req.user.userid,
        ],
        (error, result) => {
          if (error) {
            console.log(error);
            return reject(new Error(error));
          }

          return resolve();
        }
      );
    });
  }

  // Set promise array
  const promiseArray = [];

  // Loop through the array
  unsyncedInviteNotifications.forEach((item) => {
    const promise = updateNotificationSettings(item);
    promiseArray.push(promise);
  });

  Promise.all(promiseArray).then(() => {
    return res.status(200).send({
      msg: "invite notification settings synced",
      msgType: "success",
    });
  });
};
