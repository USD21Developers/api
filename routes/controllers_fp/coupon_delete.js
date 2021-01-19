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
  const couponid = req.body.couponid || 0;

  // Validate

  if (couponid === 0)
    return res
      .status(400)
      .send({ msg: "coupon id is required", msgType: "error" });

  if (typeof couponid !== "numeric") {
    return res
      .status(400)
      .send({ msg: "coupon id must be numeric", msgType: "error" });
  }

  const couponidSql = Math.abs(parseInt(couponid));
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
    ;
  `;
  db.query(sql, [couponidSql], (err, result) => {
    if (err) {
      console.log(err);
      return res
        .status(500)
        .send({ msg: "unable to query for coupon", msgType: "error" });
    }

    if (!result.length)
      return res
        .status(404)
        .send({ msg: "coupon not found", msgType: "error" });

    if (req.user.usertype !== "sysadmin") {
      if (req.user.userid !== result[0].createdBy)
        res.status(403).send({
          msg: "user may not delete another user's coupons",
          msgType: "error",
        });
    }

    const sql = `
      DELETE FROM
        coupons
      WHERE
        couponid = ?
      ;
    `;
    db.query(sql, [couponidSql], (err, result) => {
      if (err) {
        console.log(err);
        return res
          .status(500)
          .send({ msg: "unable to delete coupon", msgType: "error" });
      }

      return res
        .status(200)
        .send({ msg: "coupon deleted", msgType: "success" });
    });
  });
};
