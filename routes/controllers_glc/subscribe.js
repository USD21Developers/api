const utils = require("./utils");

exports.POST = (req, res) => {
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-glc-test")
    : require("../../database-glc");

  // Variables
  const phone = req.body.phone || "";
  const countrydata = req.body.countrydata || "";
  const firstname = req.body.firstname || "";
  const lastname = req.body.lastname || "";
  const nextevent = req.body.nextevent || 0;
  const announcements = req.body.announcements || 0;
  const gender = req.body.gender || "";

  // Validate

  if (!phone.length) {
    return res.status(400).send({ msg: "phone number must be valid", msgType: "error" });
  }

  if (countrydata === "") {
    return res.status(400).send({ msg: "phone country is required", msgType: "error" });
  }

  const validation = utils.validatePhone(phone, countrydata.iso2);
  if (!validation.isValidSmsType) {
    return res.status(400).send({ msg: "phone number must be able to receive SMS", msgType: "error" });
  }

  if (firstname.trim() === "") {
    return res.status(400).send({ msg: "first name is required", msgType: "error" });
  }

  if (lastname.trim() === "") {
    return res.status(400).send({ msg: "last name is required", msgType: "error" });
  }

  if (nextevent === 0 && announcements === 0) {
    return res.status(400).send({ msg: "at least one category must be selected", msgType: "error" });
  }

  if (gender !== "male" && gender !== "female") {
    return res.status(400).send({ msg: "gender is required", msgType: "error" });
  }

  // Check for duplicates

  const sql = `
    SELECT
      subscriptionid
    FROM
      subscriptions
    WHERE
      phone = ?
    LIMIT
      1
    ;
  `;

  db.query(sql, [phone], (error, result) => {
    if (error) {
      console.log(error);
      return res
        .status(500)
        .send({ msg: "unable to check for duplicate subscription", msgType: "error" });
    }

    if (result.length) {
      // UPDATE EXISTING SUBSCRIPTION
      const subscriptionid = result[0].subscriptionid;
      const sql = `
        UPDATE
          subscriptions
        SET
          firstname = ?,
          lastname = ?,
          phone = ?,
          phonecountry = ?,
          countrydata = ?,
          gender = ?,
          announcements = ?,
          nextevent = ?
        WHERE
          subscriptionid = ?
        ;
      `;

      db.query(sql, [firstname, lastname, phone, countrydata.iso2, JSON.stringify(countrydata), gender, announcements, nextevent, subscriptionid], (error, result) => {
        if (error) {
          console.log(error);
          return res
            .status(500)
            .send({ msg: "unable to update subscription", msgType: "error" });
        }
      });

      return res.status(200).send({ msg: "subscription updated", msgType: "success" });
    } else {
      // ADD NEW SUBSCRIPTION
      const sql = `
        INSERT INTO subscriptions(
          firstname,
          lastname,
          phone,
          phonecountry,
          countrydata,
          gender,
          announcements,
          nextevent,
          createdAt
        )
        VALUES(
          ?,
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

      db.query(sql, [firstname.trim(), lastname.trim(), phone, countrydata.iso2, JSON.stringify(countrydata), gender, announcements, nextevent], (error, result) => {
        if (error) {
          console.log(error);
          return res
            .status(500)
            .send({ msg: "unable to insert subscription", msgType: "error" });
        }

        return res.status(200).send({ msg: "subscription added", msgType: "success" });
      });
    }
  });
};
