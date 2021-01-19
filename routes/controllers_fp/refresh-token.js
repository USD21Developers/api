exports.POST = (req, res) => {
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-test")
    : require("../../database");

  const refreshToken = req.body.refreshToken || "";
  const jsonwebtoken = require("jsonwebtoken");

  if (!refreshToken.length)
    return res
      .status(400)
      .send({ msg: "refresh token missing", msgType: "error" });

  jsonwebtoken.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    (err, userdata) => {
      if (err) {
        console.log(err);
        return res
          .status(403)
          .send({ msg: "invalid refresh token", msgType: "error" });
      }

      const now = Date.now().valueOf() / 1000;
      if (now > userdata.exp)
        return res
          .status(400)
          .send({ msg: "refresh token expired", msgType: "error" });

      const userid = userdata.userid;
      const sql = `
        SELECT
          fullname,
          usertype,
          lang,
          country,
          passwordmustchange,
          subscribeduntil,
          may_redeem_coupons,
          may_create_coupons,
          may_create_preauthorized_users
        FROM
          users
        WHERE
          userid = ?
        ;
      `;
      db.query(sql, [userid], (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(500)
            .send({ msg: "unable to query for userid", msgType: "error" });
        }

        if (!result.length)
          return res
            .status(404)
            .send({ msg: "user not found", msgType: "error" });

        const fullname = result[0].fullname;
        const usertype = result[0].usertype;
        const lang = result[0].lang;
        const country = result[0].country;
        const passwordmustchange =
          result[0].passwordmustchange === 1 ? true : false;
        const may_redeem_coupons = result[0].may_redeem_coupons;
        const may_create_coupons = result[0].may_create_coupons;
        const may_create_preauthorized_users = result[0].may_create_preauthorized_users;

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
            lang: lang,
            country: country,
            passwordmustchange: passwordmustchange,
            may_redeem_coupons: may_redeem_coupons,
            may_create_coupons: may_create_coupons,
            may_create_preauthorized_users: may_create_preauthorized_users,
          },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "10m" }
        );

        return res.status(200).send({
          msg: "tokens renewed",
          msgType: "success",
          refreshToken: refreshToken,
          accessToken: accessToken,
        });
      });
    }
  );
};
