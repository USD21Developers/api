const paypal = require("paypal-rest-sdk");
const moment = require("moment");

exports.POST = (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["user", "sysadmin"];
  if (!allowedUsertypes.includes(usertype)) {
    console.log(`User (userid ${req.user.userid}) is not authorized.`);
    return res.status(401).send({
      msg: "user is not authorized for this action",
      msgType: "error",
    });
  }

  // Price
  let price = 9.99;

  // Request parameters
  const couponCode = req.body.couponCode || "";
  const productName = req.body.productName || "First Principles App";
  const productSku = req.body.productSku || "fp-app-subscription";
  const productDescription =
    req.body.productDescription || "Annual Subscription";
  const lang = req.body.lang || "en";

  // Determine whether on local or staging
  const isLocal = req.headers.referer.indexOf("localhost") >= 0 ? true : false;
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;

  // Set database
  const db = isStaging
    ? require("../../database-test")
    : require("../../database");

  // Apply coupon (if necessary)
  const sql = `
    SELECT
      c.couponid,
      UTC_TIMESTAMP() AS now,
      c.expiry AS couponexpiry,
      c.discountpercent,
      c.isdiscontinued,
      cu.createdAt AS couponUsedDate
    FROM
      coupons c
    LEFT OUTER JOIN coupons_used cu ON cu.userid = ?
    WHERE
      c.couponcode = ?
    LIMIT
      1
    ;
  `;
  db.query(sql, [req.user.userid, couponCode], (err, result) => {
    if (err) {
      console.log(err);
      return res
        .status(500)
        .send({ msg: "unable to query for coupon code", msgType: "error" });
    }

    const couponid = result.length ? result[0].couponid : null;
    const usedACoupon = couponCode.length;
    const foundTheCoupon = result.length ? true : false;
    if (usedACoupon) {
      // If coupon not found:

      if (!foundTheCoupon)
        return res.status(404).send({
          msg: "coupon not found",
          msgType: "error",
          couponCode: couponCode,
        });

      // If coupon found:

      const now = moment(result[0].now);
      const couponexpiry = moment(result[0].couponexpiry);
      const isCouponExpired = couponexpiry < now ? true : false;
      const couponUsedDate =
        result[0].couponUsedDate !== null
          ? moment(result[0].couponUsedDate)
          : null;
      const isCouponUsed =
        couponUsedDate && couponUsedDate < now ? true : false;
      const isCouponDiscontinued =
        result[0].isdiscontinued === 1 ? true : false;
      const discountpercent =
        result[0].discountpercent >= 100 ? 100 : result[0].discountpercent;
      const newprice =
        discountpercent === 100
          ? 0
          : ((discountpercent / 100) * price).toFixed(2);

      // If coupon expired:
      if (isCouponExpired)
        return res.status(401).send({
          msg: "coupon expired",
          msgType: "error",
          couponCode: couponCode,
          couponExpiry: couponexpiry,
        });

      // If coupon already used by this user:
      if (isCouponUsed)
        return res.status(401).send({
          msg: "coupon already used",
          msgType: "error",
          couponid: couponid,
          couponCode: couponCode,
          couponUsedDate: couponUsedDate,
        });

      // If coupon discontinued:
      if (isCouponDiscontinued)
        return res.status(401).send({
          msg: "coupon discontinued",
          msgType: "error",
          couponid: couponid,
          couponCode: couponCode,
        });

      // Update price
      if (newprice > 0) price = newprice;

      // Return out if price is zero
      if (newprice === 0) {
        const sql = `
          UPDATE
            users
          SET
            subscribeduntil = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 YEAR)
          WHERE
            userid = ?
          ;
        `;
        db.query(sql, [req.user.userid], (err, result) => {
          if (err) {
            console.log(err);
            return res.status(500).send({
              msg: "unable to update subscription expiry",
              msgType: "error",
            });
          }

          const sql = `
            INSERT INTO coupons_used (
              couponid, userid, createdAt
            ) VALUES (
              ?, ?, UTC_TIMESTAMP()
            );
          `;
          db.query(sql, [couponid, req.user.userid], (err, result) => {
            if (err) {
              console.log(err);
              return res.status(500).send({
                msg: "unable to designate coupon as used",
                msgType: "error",
                couponCode: couponCode,
                couponid: couponid,
              });
            }

            const jsonwebtoken = require("jsonwebtoken");

            const subscriptionToken = jsonwebtoken.sign(
              {
                userid: req.user.userid,
                usertype: req.user.usertype,
                subscribeduntil: couponexpiry.format("LL"),
              },
              process.env.SUBSCRIPTION_TOKEN_SECRET,
              { expiresIn: "365d" }
            );

            return res.status(200).send({
              msg: "total discount applied",
              msgType: "success",
              subscriptionToken: subscriptionToken,
            });
          });
        });
      }
    }

    // Configure Paypal

    if (process.env.ENV === "development" || isStaging) {
      paypal.configure({
        mode: "sandbox",
        client_id: process.env.FP_PAYPAL_SANDBOX_CLIENT_ID,
        client_secret: process.env.FP_PAYPAL_SANDBOX_SECRET,
      });
    } else {
      paypal.configure({
        mode: "live",
        client_id: process.env.FP_PAYPAL_LIVE_CLIENT_ID,
        client_secret: process.env.FP_PAYPAL_LIVE_SECRET,
      });
    }

    let host = `https://firstprinciples.mobi`;
    if (isLocal) host = "http://localhost:5000";
    if (isStaging) host = "https://staging.firstprinciples.mobi";

    let returnUrl = `${host}/lang/${lang}/account/subscribe/success/`;
    let cancelUrl = `${host}/lang/${lang}/account/subscribe/cancel/`;

    const create_payment_json = {
      intent: "sale",
      payer: {
        payment_method: "paypal",
      },
      redirect_urls: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
      transactions: [
        {
          item_list: {
            items: [
              {
                name: productName,
                sku: productSku,
                price: price,
                currency: "USD",
                quantity: 1,
              },
            ],
          },
          amount: {
            currency: "USD",
            total: price,
          },
          description: productDescription,
        },
      ],
    };

    paypal.payment.create(create_payment_json, (error, payment) => {
      if (error) {
        console.log(require("util").inspect(error, true, 7, true));
        return res
          .status(500)
          .send({ msg: "unable to create paypal payment", msgType: "error" });
      } else {
        const { id, state } = payment;
        const sql = `
        INSERT INTO payments (
          userid,
          paypalpaymentid,
          paymentstate,
          paymentjson,
          couponid,
          amount,
          currencycode,
          createdAt
        ) VALUES (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          UTC_TIMESTAMP()
        )
      `;
        const paymentjson = JSON.stringify(payment);
        let paypalURL = "";

        for (let i = 0; i < payment.links.length; i++) {
          if (payment.links[i].rel === "approval_url") {
            paypalURL = payment.links[i].href;
            break;
          }
        }

        db.query(
          sql,
          [req.user.userid, id, state, paymentjson, couponid, price, "USD"],
          (err, result) => {
            if (err) {
              console.log(err);
              return res.status(500).send({
                msg: "unable to update payments table",
                msgType: "error",
              });
            }
            return res.status(payment.httpStatusCode || 200).send({
              msg: "paypal payment created",
              msgType: "success",
              price: price,
              paypalURL: paypalURL,
              paypalpaymentid: id,
            });
          }
        );
      }
    });
  });
};
