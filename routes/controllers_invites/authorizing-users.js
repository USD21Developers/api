const jsonwebtoken = require("jsonwebtoken");

exports.POST = (req, res) => {
  // Set database
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Params
  const userToken = req.body.userToken || null;

  // Validate
  if (!userToken) {
    return res.status(400).send({
      msg: "userToken is required",
      msgType: "error",
    });
  }

  // Verify userToken
  jsonwebtoken.verify(
    userToken,
    process.env.ACCESS_TOKEN_SECRET,
    (err, userData) => {
      if (err) {
        console.log(err);
        return res
          .status(500)
          .send({ msg: "invalid userToken", msgType: "error" });
      }

      const { churchid, userid } = userData;

      const sql = `
        SELECT
          churchid,
          userid,
          gender,
          firstname,
          lastname,
          profilephoto,
          canAuthToAuth,
          createdAt
        FROM
          users
        WHERE
          userid <> ?
        AND
          churchid = ?
        AND
          userstatus = 'registered'
        AND
          isAuthorized = 1
        AND
          canAuthorize = 1
        ORDER BY
          lastname,
          firstname
        ;
      `;

      db.query(sql, [userid, churchid], (error, result) => {
        if (error) {
          console.log(error);
          return res.status(500).send({
            msg: "unable to query for authorizing users",
            msgType: "error",
          });
        }

        if (!result.length) {
          return res.status(400).send({
            msg: "no authorizing users found",
            msgType: "error",
          });
        }

        return res.status(200).send({
          msg: "authorizing users retrieved",
          msgType: "success",
          users: result,
        });
      });
    }
  );
};
