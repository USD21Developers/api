exports.GET = (req, res) => {
  const NodeCache = require("node-cache");
  const cache = new NodeCache();
  const db = require("../../database-services");

  const sql = `
    SELECT 
      churchID,
      CONVERT(CAST(church_name as BINARY) USING utf8) AS church_name,
      church_URL,
      CONVERT(CAST(contact_name as BINARY) USING utf8) AS contact_name,
      CONVERT(CAST(contact_number as BINARY) USING utf8) AS contact_number,
      image AS contact_image,
      CONVERT(CAST(mailing_city as BINARY) USING utf8) AS mailing_city,
      CONVERT(CAST(mailing_state as BINARY) USING utf8) AS mailing_state,
      CONVERT(CAST(mailing_country as BINARY) USING utf8) AS mailing_country,
      CONVERT(CAST(identifying_place as BINARY) USING utf8) AS identifying_place,
      LCASE(country_iso) AS country_iso
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
