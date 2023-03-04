exports.GET = (req, res) => {
  const db = require("../../database-services");

  const sql = `
    SELECT 
      churchID,
      CONVERT(CAST(church_name as BINARY) USING utf8) AS church_name,
      church_URL,
      CONVERT(CAST(contact_name as BINARY) USING utf8) AS contact_name,
      CONVERT(CAST(contact_number as BINARY) USING utf8) AS contact_number,
      contact_image,
      CONVERT(CAST(mailing_city as BINARY) USING utf8) AS mailing_city,
      CONVERT(CAST(mailing_state as BINARY) USING utf8) AS mailing_state,
      CONVERT(CAST(mailing_country as BINARY) USING utf8) AS mailing_country,
      CONVERT(CAST(identifying_place as BINARY) USING utf8) AS identifying_place,
      country_iso
    FROM 
      churches
    ORDER BY
      country_iso,
      identifying_place,
      church_name
    ;
  `;

  db.query(sql, [], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({
        msg: "unable to query service for churches",
        msgType: "error",
      });
    }

    const data = result.map((item) => {
      let imageURL = "";

      if (typeof item.contact_image === "object") {
        imageURL = `https://www.upsidedown21.org/1.1/images/church_leaders/${item.churchID}.jpg?ver=1.6.2`;
      }

      item.contact_image = imageURL;

      return item;
    });

    return res.status(200).send({
      msg: "churches retrieved",
      msgType: "success",
      churches: data,
    });
  });
};
