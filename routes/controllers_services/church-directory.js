exports.GET = (req, res) => {
  const db = require("../../database-services");

  const sql = `
    SELECT 
      churchID,
      church_name,
      church_URL,
      contact_name,
      contact_number,
      contact_image,
      mailing_city,
      mailing_state,
      mailing_country,
      identifying_place,
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

    const htmlEntities = require("html-entities");

    const data = result.map((item) => {
      let imageURL = "";
      let churchName = ""; // church_name
      let contactName = ""; // contact_name

      if (typeof item.contact_image === "object") {
        imageURL = `https://www.upsidedown21.org/1.1/images/church_leaders/${item.churchID}.jpg?ver=1.6.2`;
      }

      churchName = item.church_name;
      contactName = item.contact_name;

      // Decode
      churchName = htmlEntitles.decode(churchName, {
        level: "all",
      });
      contactName = htmlEntitles.decode(contactName, {
        level: "all",
      });

      // Encode
      churchName = htmlEntities.encode(churchName, {
        mode: "specialChars",
      });
      contactName = htmlEntities.encode(contactName, {
        mode: "specialChars",
      });

      item.contact_image = imageURL;
      item.church_name = churchName;
      item.contact_name = contactName;

      return item;
    });

    return res.status(200).send({
      msg: "churches retrieved",
      msgType: "success",
      churches: data,
    });
  });
};
