const paypal = require("paypal-rest-sdk");

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
  const price = "9.99";

  // Request parameters
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
        [req.user.userid, id, state, paymentjson, price, "USD"],
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
            paypalURL: paypalURL,
          });
        }
      );
    }
  });
};
