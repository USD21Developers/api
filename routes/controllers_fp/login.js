exports.POST = (req, res) => {
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-test")
    : require("../../database");
  const bcrypt = require("bcrypt");
  const username = req.body.username;
  const password = req.body.password;
  const sql =
    "SELECT userid, password, fullname, usertype, userstatus, passwordmustchange, subscribeduntil FROM users WHERE username = ? LIMIT 1;";
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

    const passwordFromDB = result[0].password;
    const fullname = result[0].fullname;
    const userid = result[0].userid;
    const usertype = result[0].usertype;
    const userstatus = result[0].userstatus;
    const passwordmustchange =
      result[0].passwordmustchange === 1 ? true : false;
    const subscribeduntil = parseInt(result[0].subscribeduntil) || 0;
    const now = Date.now().valueOf() / 1000;
    const numSecondsUntilSubscriptionExpires =
      subscribeduntil > now ? subscribeduntil - now : 0;

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
        { expiresIn: "90d" }
      );

      const accessToken = jsonwebtoken.sign(
        {
          name: fullname,
          userid: userid,
          usertype: usertype,
          passwordmustchange: passwordmustchange == 1 ? true : 0,
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
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
