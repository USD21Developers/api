const moment = require("moment-timezone");

exports.POST = (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["sysadmin"];
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
    ? require("../../database-test")
    : require("../../database");

  // Get request params
  const couponcode = req.body.couponcode || "";
  const expiry = req.body.expiry || "";
  const discountpercent = req.body.discountpercent || 0;

  // Validate

  if (!couponcode.length)
    return res
      .status(400)
      .send({ msg: "coupon code must not be blank", msgType: "error" });

  if (couponcode.length > 255)
    return res.status(400).send({
      msg: "coupon code length must not exceed 255 characters",
      msgType: "error",
    });

  if (!expiry.length)
    return res
      .status(400)
      .send({ msg: "expiry must not be blank", msgType: "error" });

  const expiryIsValidDate = moment(expiry).isValid() || false;
  if (!expiryIsValidDate)
    return res
      .status(400)
      .send({ msg: "invalid expiry date", msgType: "error" });

  const expiryIsInFuture = moment(expiry).utc() > moment.utc();
  if (!expiryIsInFuture)
    return res
      .status(400)
      .send({ msg: "expiry must be in the future", msgType: "error" });

  if (typeof discountpercent !== "number")
    return res
      .status(400)
      .send({ msg: "discount percent must be numeric", msgType: "error" });

  const expirySql = moment(expiry).utc().format("YYYY-MM-DD 00:00:00");
  const discountPctSql = Math.abs(parseInt(discountpercent)) || 0;

  if (discountPctSql > 100)
    return res
      .status(400)
      .send({ msg: "discount must not exceed 100 percent", msgType: "error" });

  const sql = `
    SELECT
      couponid
    FROM
      coupons
    WHERE
      couponcode = ?
    LIMIT
      1
  `;
  db.query(sql, [couponcode], (err, result) => {
    if (err) {
      console.log(err);
      return res
        .status(500)
        .send({ msg: "unable to query for existing coupon", msgType: "error" });
    }

    if (result.length) {
      return res.status(400).send({
        msg: "coupon code already in use",
        msgType: "error",
        couponid: couponid,
      });
    }

    const sql = `
      INSERT INTO coupons(
        couponcode, expiry, discountpercent, createdBy, createdAt
      ) VALUES(
        ?, ?, ?, ?, UTC_TIMESTAMP()
      );
    `;
    db.query(
      sql,
      [couponcode, expirySql, discountPctSql, req.user.userid],
      (err, result) => {
        if (err) {
          console.log(err);
          return res
            .status(500)
            .send({ msg: "unable to insert coupon", msgType: "error" });
        }

        const couponid = result.insertId;
        return res.status(200).send({
          msg: "coupon added",
          msgType: "success",
          couponid: couponid,
        });
      }
    );
  });
};
