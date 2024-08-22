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
  const setFollowups = (unsyncedFollowups, value) => {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(unsyncedFollowups)) return resolve();
      if (!unsyncedFollowups.length) return resolve();
      if (typeof value !== "number") return reject();
      if (value !== 0 && value !== 1) return reject();

      const invitationids = unsyncedFollowups.map((item) => {
        const { invitationid, sentvia } = item;
        if (sentvia === "qrcode") return;
        return invitationid;
      });

      const sql = `
        UPDATE
          invitations
        SET
          followup = ?
        WHERE
          invitationid IN (?)
        AND
          userid = ?
        AND
          sentvia !== 'qrcode'
        ;
      `;

      db.query(
        sql,
        [value, invitationids, req.user.userid],
        (error, result) => {
          if (error) {
            console.log(error);
            return reject(error);
          }
          return resolve(result);
        }
      );
    });
  };

  // Set promise array
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

  return res.status(200).send({
    msg: "updated invites synced",
    msgType: "success",
  });
};
