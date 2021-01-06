exports.POST = (req, res) => {
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-test")
    : require("../../database");
  const bcrypt = require("bcrypt");
  const username = req.body.username;
  const password = req.body.password;
  const sql = `
    SELECT
      userid,
      password,
      fullname,
      usertype,
      userstatus,
      passwordmustchange,
      subscribeduntil,
      UTC_TIMESTAMP AS now,
      ABS(DATEDIFF(UTC_TIMESTAMP, subscribeduntil)) AS daysUntilSubscriptionExpiry
    FROM
      users
    WHERE
      username = ?
    LIMIT
      1
    ;
  `;
  db.query(sql, [username], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({
        msg: "unable to query for user",
        msgType: "error",
      });
    }

    if (!result.length)
      return res.status(404).send({
        msg: "invalid login",
        msgType: "error",
      });

    const moment = require("moment");

    const passwordFromDB =
      result[0].password ||
      "b2ca37dd76e32a0edf943845885dbd41e090fbe9e175d27b9242ea53c89f7612";
    const fullname = result[0].fullname || "";
    const userid = result[0].userid || 0;
    const usertype = result[0].usertype || "user";
    const userstatus = result[0].userstatus || "pending confirmation";
    const passwordmustchange =
      result[0].passwordmustchange === 1 ? true : false;

    const subscribeduntil = result[0].subscribeduntil || null;
    const daysUntilSubscriptionExpiry =
      result[0].daysUntilSubscriptionExpiry || 0;

    if (userstatus !== "registered") {
      return res
        .status(400)
        .send({ msg: "user status is not registered", msgType: "error" });
    }

    bcrypt.compare(password, passwordFromDB, (err, result) => {
      const jsonwebtoken = require("jsonwebtoken");

      if (err)
        return res.status(500).send({
          msg: "unable to verify login",
          msgType: "error",
        });

      if (!result)
        return res.status(404).send({
          msg: "invalid login",
          msgType: "error",
        });

      const refreshToken = jsonwebtoken.sign(
        {
          userid: userid,
          usertype: usertype,
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "30d" }
      );

      const accessToken = jsonwebtoken.sign(
        {
          name: fullname,
          userid: userid,
          usertype: usertype,
          passwordmustchange: passwordmustchange == 1 ? true : 0,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "10m" }
      );

      // Set return object
      let returnObject = {
        msg: "user authenticated",
        msgType: "success",
        refreshToken: refreshToken,
        accessToken: accessToken,
      };

      // If subscription is current, send back a subscription token
      const subscriptionexists = subscribeduntil !== null;
      if (subscriptionexists) {
        const now = moment.utc();
        const subscriptionExpiry = moment(subscribeduntil);
        const daysUntilSubscriptionExpiry = Math.abs(
          subscriptionExpiry.diff(now, "days")
        );
        const isCurrent = subscriptionExpiry > now;
        console.log(`isCurrent: ${isCurrent}`);
        console.log(`subscriptionExpiry: ${subscriptionExpiry}`);
        console.log(
          `daysUntilSubscriptionExpiry: ${daysUntilSubscriptionExpiry}`
        );
        if (isCurrent) {
          const subscriptionToken = jsonwebtoken.sign(
            {
              userid: userid,
              usertype: usertype,
              subscribeduntil: subscriptionExpiry.format(
                "MMMM D, YYYY HH:mm:ss"
              ),
            },
            process.env.SUBSCRIPTION_TOKEN_SECRET,
            { expiresIn: `${daysUntilSubscriptionExpiry}d` }
          );

          returnObject = {
            msg: "user authenticated",
            msgType: "success",
            refreshToken: refreshToken,
            accessToken: accessToken,
            subscriptionToken: subscriptionToken,
            subscribeduntil: subscribeduntil,
          };
        }
      }

      return res.status(200).send(returnObject);
    });
  });
};
