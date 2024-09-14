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

  // Parameters
  const countryid = req.body.countryid ? req.body.countryid : null;
  const churchid = req.body.churchid ? req.body.churchid : null;

  if (!countryid) {
    return res.status(400).send({
      msg: "countryid is required",
      msgType: "error",
    });
  }

  if (!churchid) {
    return res.status(400).send({
      msg: "churchid is required",
      msgType: "error",
    });
  }

  const sql = `
    UPDATE
      users
    SET
      churchid = ?,
      country = ?
    WHERE
      userid = ?
    ;
  `;

  db.query(
    sql,
    [Number(churchid), countryid, req.user.userid],
    (error, result) => {
      if (error) {
        return res.status(500).send({
          msg: "unable to update churchid",
          msgType: "error",
        });
      }

      return res.status(200).send({
        msg: "churchid updated",
        msgType: "success",
      });
    }
  );
};
