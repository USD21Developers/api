exports.GET = (req, res) => {
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

  // Query
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM coupons WHERE expiry > UTC_TIMESTAMP() AND isdiscontinued = 0) AS num_active,
      (SELECT COUNT(*) FROM coupons WHERE expiry <= UTC_TIMESTAMP()) AS num_expired,
      (SELECT COUNT(*) FROM coupons WHERE isdiscontinued = 1) AS num_discontinued,
      (SELECT COUNT(*) FROM coupons_used) AS num_redeemed,
      (
        SELECT
          c.couponcode
        FROM
          coupons c
        INNER JOIN
          coupons_used cu
        ON
          c.couponid = cu.couponid
        ORDER BY
          cu.createdAt DESC
        LIMIT 1
      ) AS most_recent_couponcode,
      (SELECT createdAt FROM coupons_used ORDER BY createdAt DESC LIMIT 1) AS most_recent_redemption_date,
      (SELECT SUM(amount) FROM payments WHERE couponid IS NOT NULL) AS cumulative_amount
    FROM
      coupons
    LIMIT
      1
    ;
  `;
  db.query(sql, [], (err, result) => {
    if (err) {
      console.log(err);
      return res
        .status(500)
        .send({ msg: "unable to get coupon metadata", msgType: "error" });
    }

    if (!result.length)
      return res
        .status(404)
        .send({ msg: "no coupon metadata found", msgType: "success" });

    const {
      num_active,
      num_expired,
      num_discontinued,
      num_redeemed,
      most_recent_couponcode,
      most_recent_redemption_date,
      cumulative_amount,
    } = result[0];

    return res.status(200).send({
      msg: "coupon metadata retrieved",
      msgType: "success",
      data: {
        num_active: num_active,
        num_expired: num_expired,
        num_discontinued: num_discontinued,
        num_redeemed: num_redeemed,
        most_recent_couponcode: most_recent_couponcode,
        most_recent_redemption_date: most_recent_redemption_date,
        cumulative_amount: cumulative_amount,
      },
    });
  });
};
