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
  const showexpired = req.body.showexpired === true ? true : false;
  const showdiscontinued = req.body.showdiscontinued === true ? true : false;
  let showonlymine = req.body.showonlymine === true ? true : false;

  // Build query
  if (req.user.usertype !== "sysadmin") showonlymine = true;
  let sql = `
    SELECT
      c.couponid,
      c.couponcode,
      c.expiry,
      c.discountpercent,
      c.isdiscontinued,
      u.userid,
      u.fullname
    FROM
      coupons c
    LEFT OUTER JOIN users u ON u.userid = c.createdBy
    WHERE
      c.couponid IS NOT NULL
  `;
  if (!showexpired) {
    sql += `
      AND expiry > UTC_TIMESTAMP()
    `;
  }
  if (!showdiscontinued) {
    sql += `
      AND isdiscontinued = 1
    `;
  }
  if (!showonlymine) {
    sql += `
      AND createdBy = ${req.user.userid}
    `;
  }
  sql += `
    ORDER BY
      c.expiry DESC,
      c.isdiscontinued ASC,
      c.discountpercent DESC,
      u.lastname ASC,
      u.firstname ASC,
      u.fullname ASC
    ;
  `;
  db.query(sql, [], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({msg: "unable to retrieve coupons", msgType: "error"});
    }

    if (!result.length) return res.status(200).send({msg: "no coupons found", msgType: "success", data=[]});

    let returnObject = [];
    let numcoupons = result.length;
    for (let i = 0; i < numcoupons; i++) {
      const { couponid, couponcode, expiry, discountpercent=100, isdiscontinued=0, userid="", fullname="" } = result[i];
      returnObject.push({
        couponid: couponid,
        couponcode: couponcode,
        expiry: expiry,
        discountpercent: discountpercent,
        isdiscontinued: isdiscontinued,
        userid: userid,
        fullname: fullname
      });
    };

    return res.status(200).send({msg: "coupons retrieved", msgType: "success", data: returnObject});
  });
};
