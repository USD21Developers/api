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
          reject(error);
        }

        resolve(result[0]);
      });
    });
  };

  const retrieve = (db) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          settings
        FROM
          users
        WHERE
          userid = ?
        ;
      `;

      db.query(sql, [req.user.userid], (error, result) => {
        if (error) {
          console.log(error);
          reject(error);
        }

        resolve(result[0]);
      });
    });
  };

  if (unsyncedSettings) {
    await update(db, unsyncedSettings);
  }

  const response = await retrieve(db);

  return res.status(200).send({
    msg: "settings synced",
    msgType: "success",
    settings: JSON.parse(response.settings),
  });
};
