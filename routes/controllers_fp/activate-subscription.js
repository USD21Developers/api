const { access } = require("fs");
const paypal = require("paypal-rest-sdk");

exports.POST = (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["user"];
  if (!allowedUsertypes.includes(usertype)) {
    console.log(`User (userid ${req.user.userid}) is not authorized.`);
    return res.status(401).send({
      msg: "user is not authorized for this action",
      msgType: "error",
    });
  }

  // Determine whether on local or staging
  const isLocal = req.headers.referer.indexOf("localhost") >= 0 ? true : false;
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;

  // Set database
  const db = isStaging
    ? require("../../database-test")
    : require("../../database");

  // Configure Paypal
  if (isLocal || isStaging) {
    paypal.configure({
      mode: "sandbox",
      client_id: process.env.FP_PAYPAL_SANDBOX_CLIENT_ID,
      client_secret: process.env.FP_PAYPAL_SANDBOX_SECRET,
    });
  } else if (process.env.ENV === "production") {
    paypal.configure({
      mode: "live",
      client_id: process.env.FP_PAYPAL_LIVE_CLIENT_ID,
      client_secret: process.env.FP_PAYPAL_LIVE_SECRET,
    });
  }

  const PayerID = req.body.PayerID || "";
  const paymentId = req.body.paymentId || "";

  var execute_payment_json = {
    payer_id: PayerID,
    transactions: [
      {
        amount: {
          currency: "USD",
          total: "9.99",
        },
      },
    ],
  };

  paypal.payment.execute(paymentId, execute_payment_json, (error, payment) => {
    if (error) {
      console.log(require("util").inspect(error, true, 7, true));
      return res
        .status(500)
        .send({ msg: "unable to activate subscription", msgType: "error" });
    } else {
      const paymentstate = payment.state;
      const paymentid = payment.id;
      const isPaymentApproved = paymentstate === "approved" ? true : false;

      if (!isPaymentApproved)
        return res
          .status(401)
          .send({ msg: "payment not approved", msgType: "error" });

      // Payment is approved. Make sure that payment hasn't already been recorded before augmenting subscription expiry.
      const sql = `
        SELECT
          paymentid
        FROM
          payments
        WHERE
          paypalpaymentid = ?
        AND
          paymentstate = ?
        LIMIT
          1
        ;
      `;

      db.query(sql, [paymentid, paymentstate], (err, result) => {
        if (err) {
          console.log(err);
          return res.state(500).send({
            msg: "unable to determine prior payment",
            msgType: "error",
          });
        }

        if (!result.length) {
          // There is no record of this payment having been recorded, so augment subscription expiry
          const sql = `
          SELECT
            subscribeduntil,
            UTC_TIMESTAMP() AS now
          FROM
            users
          WHERE
            userid = ?
          LIMIT
            1
          ;
        `;
          db.query(sql, [req.user.userid], (err, result) => {
            if (err) {
              console.log(err);
              return res.status(500).send({
                msg: "unable to query for subscription expiry",
                msgType: "error",
              });
            }

            if (!result.length)
              return res
                .status(404)
                .send({ msg: "user not found", msgType: "error" });

            const moment = require("moment");
            const currentExpiry = moment(result[0].subscribeduntil);
            const now = moment(result[0].now);
            let sql;
            if (currentExpiry > now) {
              sql = `
              UPDATE
                users
              SET
                subscribeduntil = DATE_ADD(subscribeduntil, INTERVAL 1 YEAR)
              WHERE
                userid = ?
              ;
            `;
            } else {
              sql = `
              UPDATE
                users
              SET
                subscribeduntil = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 YEAR)
              WHERE
                userid = ?
              ;
            `;
            }
            db.query(sql, [req.user.userid], (err, result) => {
              if (err) {
                console.log(err);
                return res.status(500).send({
                  msg: "unable to augment subscription expiry",
                  msgType: "error",
                });
              }

              const sql = `
              SELECT
                fullname,
                usertype,
                passwordmustchange,
                subscribeduntil,
                ABS(DATEDIFF(subscribeduntil, UTC_TIMESTAMP)) AS newExpiryDaysAhead
              FROM
                users
              WHERE
                userid = ?
              ;
            `;
              db.query(sql, [req.user.userid], (err, result) => {
                if (err) {
                  console.log(err);
                  return res
                    .status(500)
                    .send({ msg: "unable to select subscription expiry" });
                }

                if (!result.length)
                  return res
                    .status(404)
                    .send({ msg: "user not found", msgType: "error" });

                const fullname = result[0].fullname || "";
                const usertype = result[0].usertype || "user";
                const passwordmustchange = result[0].passwordmustchange || 0;

                const numDaysAhead = result[0].newExpiryDaysAhead.length
                  ? result[0].newExpiryDaysAhead
                  : 365;

                const jsonwebtoken = require("jsonwebtoken");

                const refreshToken = jsonwebtoken.sign(
                  {
                    userid: req.user.userid,
                    usertype: usertype,
                  },
                  process.env.REFRESH_TOKEN_SECRET,
                  { expiresIn: "30d" }
                );

                const accessToken = jsonwebtoken.sign(
                  {
                    name: fullname,
                    userid: req.user.userid,
                    usertype: usertype,
                    passwordmustchange: passwordmustchange == 1 ? true : 0,
                  },
                  process.env.ACCESS_TOKEN_SECRET,
                  { expiresIn: "10m" }
                );

                const subscriptionToken = jsonwebtoken.sign(
                  {
                    userid: req.user.userid,
                    usertype: usertype,
                    subscribeduntil: result[0].subscribeduntil,
                  },
                  process.env.SUBSCRIPTION_TOKEN_SECRET,
                  { expiresIn: `${numDaysAhead}d` }
                );

                const sql = `
                  UPDATE
                    payments
                  SET
                    paymentstate = ?,
                    paymentjson = ?
                  WHERE
                    paypalpaymentid = ?
                  ;
                `;
                db.query(
                  sql,
                  [payment.state, JSON.stringify(payment), payment.id],
                  (err, result) => {
                    if (err) {
                      console.log(err);
                      return res.status(500).send({
                        msg: "unable to update payments table",
                        msgType: "error",
                      });
                    }

                    return res.status(200).send({
                      msg: "subscription activated",
                      msgType: "success",
                      refreshToken: refreshToken,
                      accessToken: accessToken,
                      subscriptionToken: subscriptionToken,
                    });
                  }
                );
              });
            });
          });
        } else {
          // Payment was already recorded. Don't augment subscription expiry a second time.
          return res.status(304).send({
            msg: "already recorded successful payment",
            msgType: "error",
          });
        }
      });
    }
  });
};
