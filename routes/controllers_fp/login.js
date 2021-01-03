exports.POST = (req, res) => {
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-test")
    : require("../../database");
  const bcrypt = require("bcrypt");
  const username = req.body.username;
  const password = req.body.password;
  const sql =
    "SELECT userid, password, fullname, usertype, userstatus, passwordmustchange, subscribeduntil, UTC_TIMESTAMP AS now FROM users WHERE username = ? LIMIT 1;";
  db.query(sql, [username], (err, result) => {
    if (err) {
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

    const passwordFromDB = result[0].password;
    const fullname = result[0].fullname;
    const userid = result[0].userid;
    const usertype = result[0].usertype;
    const userstatus = result[0].userstatus;
    const passwordmustchange =
      result[0].passwordmustchange === 1 ? true : false;

    const subscribeduntil = result[0].subscribeduntil.length
      ? moment(result[0].subscribeduntil)
      : moment(0);
    const now = moment(result[0].now);

    const numSecondsUntilSubscriptionExpires =
      subscribeduntil > now ? subscribeduntil.diff(now, "s") : 0;

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

      const subscriptionToken = jsonwebtoken.sign(
        {
          userid: userid,
          subscribeduntil: subscribeduntil,
        },
        process.env.SUBSCRIPTION_TOKEN_SECRET,
        { expiresIn: `${numSecondsUntilSubscriptionExpires}s` }
      );

      return res.status(200).send({
        msg: "user authenticated",
        msgType: "success",
        refreshToken: refreshToken,
        accessToken: accessToken,
        subscriptionToken: subscriptionToken,
      });
    });
  });
};
