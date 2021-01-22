exports.POST = (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["user", "sysadmin"];
  if (!allowedUsertypes.includes(usertype)) {
    console.log(`User (userid ${req.user.userid}) is not authorized.`);
    return res.status(401).send({
      msg: "user is not authorized for this action",
      msgType: "error",
    });
  }
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-test")
    : require("../../database");

  const sql = `
    SELECT
      (SELECT COUNT(userid) FROM users WHERE subscribeduntil > UTC_TIMESTAMP()) AS active_subscribers,
      (SELECT COUNT(userid) FROM users WHERE userstatus = 'registered') AS total_users,
      (SELECT SUM(amount) FROM payments WHERE paymentstate = 'approved') AS amt_raised
    FROM
      users
    LIMIT
      1
    ;
  `;
  db.query(sql, [], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({msg: "unable to query for admin metadata", msgType: "error"});
    }

    if (!result.length) return res.status(200).send({msg: "no admin metadata available", msgType: "success"});

    const active_subscribers = result[0].active_subscribers;
    const total_users = result[0].total_users;
    const amt_raised = result[0].amt_raised;

    const sql = `
      SELECT
        country
      FROM
        users
      WHERE
        userstatus = 'registered'
      AND
        subscribeduntil > UTC_TIMESTAMP()
      GROUP BY
        country
      ORDER BY
        country ASC
      ;
    `;
    db.query(sql, [], (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send({msg: "unable to query for user countries", msgType: "error"});
      }

      if (!result.length) return res.status(404).send({msg: "no user countries found", msgType: "error"});

      const countries = result;

      const sql = `
        SELECT
          lang
        FROM
          users
        WHERE
          userstatus = 'registered'
        AND
          subscribeduntil > UTC_TIMESTAMP()
        GROUP BY
          lang
        ORDER BY
          lang ASC
        ;
      `;
      db.query(sql, [], (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).send({msg: "unable to query for user languages", msgType: "error"});
        }

        if (!result.length) return res.status(404).send({msg: "no user languages found", msgType: "error"});

        const languages = result;

        const returnObject = {
          active_subscribers: active_subscribers,
          total_users: total_users,
          amt_raised: amt_raised,
          countries: countries,
          languages: languages
        };

        return res.status(200).send({msg: "admin metadata retrieved", msgType: "success", data: returnObject})
      });
    });
  });
};
