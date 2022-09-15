exports.POST = async (req, res) => {
    // Enforce authorization
    const usertype = req.user.usertype;
    const allowedUsertypes = ["sysadmin", "user"];
    let isAuthorized = false;
    if (allowedUsertypes.includes(usertype)) isAuthorized = true;
    if (req.user.may_create_coupons) isAuthorized = true;
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
    const fetchChurches = require("../controllers_services/churches").FETCH;
    const churches = await fetchChurches();

    if (!Array.isArray(churches)) {
      return res.status(500).send({msg: "unable to retrieve churches", msgType: "error"});
    }

    const firstName = req.body.firstName || "";
    const lastName = req.body.lastName || "";

    if (typeof firstName !== "string") {
      return res.status(400).send({msg: "first name must be a string", msgType: "error"});
    }

    if (typeof lastName !== "string") {
      return res.status(400).send({msg: "last name must be a string", msgType: "error"});
    }

    if ((!firstName.trim().length) && (!lastName.trim().length)) {
      return res.status(400).send({msg: "name searched must not be blank", msgType: "error"});
    }

    const sql = `
      SELECT
        userid,
        firstname,
        lastname,
        gender
      FROM
        users
      WHERE
        userstatus === 'registered'
      AND
        userid <> ?
      AND
        churchid = ?
      AND
        (
          firstname LIKE ?

          OR

          lastname LIKE ?
        )
      ORDER BY
        lastname,
        firstname
      ;
    `;

    db.query(sql, [req.user.userid, req.user.churchid, `%${firstName}%`, `%${lastName}%`], (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send({
          msg: "unable to query other users in same congregation",
          msgType: "error",
        });
      }

      return res.status(200).send({msg: "users within same congregation queried", msgType: "success", matches: result});
    });
  };
  