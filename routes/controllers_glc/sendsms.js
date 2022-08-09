exports.POST = (req, res) => {
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-glc-test")
    : require("../../database-glc");
  const utils = require("./utils");
  const sendSms = utils.sendSms;
  const category = req.body.category || "";
  const gender = req.body.gender || "";
  const message = req.body.message || "";

  // Validate category
  if (typeof category !== "string" || ["next session", "announcement"].includes(category) === false) {

  }

  // Validate content
  if (typeof message !== "string" || message.length === 0) {
    return res.status(400).send({ msg: "invalid message body", msgType: "error" });
  }

  let sql = `
    SELECT
      phone
    FROM
      subscriptions
    WHERE
      unsubscribed = 0
  `;
  if (category == "next session") {
    sql += `
      AND nextevent = 1
    `;
  }
  if ((gender === "male" || gender === "female")) {
    sql += `
      AND gender = '${gender}'
    `;
  }

  db.query(sql, [], (error, result) => {
    if (error) {
      return res.status(500).send({ msg: "unable to query for recipients", msgType: "error" });
    }

    result.forEach(item => {
      const recipient = item.phone;

      sendSms(recipient, message)
        .then((twilioResponse) => {
          // console.log(twilioResponse);
        })
        .catch((err) => {
          console.log(err);
        });
    });

    res.status(200).send({ msg: "message sent", msgType: "success" });
  });
}