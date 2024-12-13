exports.GET = (req, res) => {
  const NodeCache = require("node-cache");
  const cache = new NodeCache();
  const db = require("../../database-services");

  const sql = `
    SELECT 
      churchID,
      isActive,
      church_name AS church_name,
      church_URL,
      contact_name AS contact_name,
      contact_number AS contact_number,
      image AS contact_image,
      mailing_city AS mailing_city,
      mailing_state AS mailing_state,
      mailing_country AS mailing_country,
      identifying_place AS identifying_place,
      LCASE(country_iso) AS country_iso
    FROM 
      churches
    WHERE
      isActive = 1
    ORDER BY
      country_iso,
      identifying_place,
      church_name
    ;
  `;

  db.query(sql, [], (err, result) => {
    if (err) {
      console.log(err);

      const cachedData = cache.get("churchDirectory");
      if (cachedData && cachedData.length) {
        return res.status(200).send({
          msg: "churches retrieved",
          msgType: "success",
          churches: cachedData,
        });
      }

      return res.status(500).send({
        msg: "unable to query service for churches",
        msgType: "error",
      });
    }

    const oneWeek = 604800;
    cache.set("churchDirectory", result, oneWeek);

    return res.status(200).send({
      msg: "churches retrieved",
      msgType: "success",
      churches: result,
    });
  });
};
