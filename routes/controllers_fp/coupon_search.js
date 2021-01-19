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

  // Validate
  if (!couponcode.length)
    return res
      .status(400)
      .send({ msg: "coupon code must not be blank", msgType: "error" });

  // Query
  const sql = `
    SELECT
      c.couponid,
      c.expiry,
      c.discountpercent,
      c.isdiscontinued,
      u.userid,
      u.fullname
    FROM
      coupons c
    WHERE
      c.couponcode = ?
    LIMIT
      1
    ;
  `;
  db.query(sql, [couponcode], (err, result) => {
    if (err) {
      console.log(err);
      return res
        .status(500)
        .send({ msg: "unable to retrieve coupon", msgType: "error" });
    }

    if (!result.length)
      return res
        .status(404)
        .send({ msg: "coupon not found", msgType: "error" });

    const {
      couponid,
      couponcode,
      expiry,
      discountpercent,
      isdiscontinued,
      userid,
      fullname,
    } = result[0];

    const returnObject = {
      couponid: couponid,
      couponcode: couponcode,
      expiry: expiry,
      discountpercent: discountpercent,
      isdiscontinued: isdiscontinued,
      userid: userid,
      fullname: fullname,
    };

    return res
      .status(200)
      .send({
        msg: "coupon retrieved",
        msgType: "success",
        data: returnObject,
      });
  });
};
