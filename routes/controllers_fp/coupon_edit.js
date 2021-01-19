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
  const couponid = req.body.couponid;
  const couponcode = req.body.couponcode || "";
  const expiry = req.body.expiry || "";
  const discountpercent = req.body.discountpercent || 0;
  const isdiscontinued = req.body.isdiscontinued === true ? true : false;

  // Validate

  if (!couponid.length)
    return res
      .status(400)
      .send({ msg: "coupon id must not be blank", msgType: "error" });

  if (typeof couponid !== "numeric")
    return res.status(400).send({
      msg: "coupon id must be numeric",
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
      couponid,
      createdBy
    FROM
      coupons
    WHERE
      couponid = ?
    LIMIT
      1
  `;

  const couponidSql = Math.abs(parseInt(couponid));
  db.query(sql, [couponidSql], (err, result) => {
    if (err) {
      console.log(err);
      return res
        .status(500)
        .send({ msg: "unable to query for existing coupon", msgType: "error" });
    }

    if (!result.length)
      return res
        .status(404)
        .send({ msg: "coupon not found", msgType: "error" });

    if (req.user.usertype !== "sysadmin") {
      if (req.user.userid !== result[0].createdBy)
        res.status(403).send({
          msg: "user may not edit another user's coupons",
          msgType: "error",
        });
    }

    const sql = `
      SELECT
        couponid
      FROM
        coupons
      WHERE
        couponid <> ?
      AND
        couponcode = TRIM(LCASE(?))
      LIMIT
        1
      ;
    `;
    db.query(sql, [couponidSql, couponcode], (err, result) => {
      if (err) {
        console.log(err);
        return res
          .status(500)
          .send({
            msg: "unable to check for duplicate couponcode",
            msgType: "error",
          });
      }

      if (result[0].length)
        return res
          .status(400)
          .send({ msg: "coupon code is already in use", msgType: "error" });

      const sql = `
        UPDATE
          coupons
        SET
          couponcode = TRIM(LCASE(?)),
          expiry = ?,
          discountpercent = ?,
          isdiscontinued = ?
        WHERE
          couponid = ?
        ;
      `;
      db.query(
        sql,
        [couponcode, expirySql, discountPctSql, isdiscontinued, couponidSql],
        (err, result) => {
          if (err) {
            console.log(err);
            return res
              .status(500)
              .send({ msg: "unable to update coupon", msgType: "error" });
          }

          return res
            .status(200)
            .send({ msg: "coupon updated", msgType: "success" });
        }
      );
    });
  });
};
