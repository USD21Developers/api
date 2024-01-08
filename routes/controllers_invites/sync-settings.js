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
  const settings = req.body.settings || {};

  const sql = `
    UPDATE
      users
    SET
      settings = ?
    WHERE
      userid = ?
    ;
  `;

  db.query(
    sql,
    [JSON.stringify(settings), req.user.userid],
    (error, result) => {
      if (error) {
        console.log(error);
        return res.status(500).send({
          msg: "unable to update settings",
          msgType: "error",
        });
      }

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
          return res.status(500).send({
            msg: "unable to sync settings",
            msgType: "error",
          });
        }
        return res.status(200).send({
          msg: "settings synced",
          msgType: "success",
          settings: result[0],
        });
      });
    }
  );
};
