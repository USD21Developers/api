exports.GET = (req, res) => {
  const NodeCache = require("node-cache");
  const cache = new NodeCache();
  const db = require("../../database-services");

  const sql = `
    SELECT 
      churchID,
      isActive,
      CONVERT(CAST(church_name AS BINARY) USING utf8) AS church_name,
      church_URL,
      CONVERT(CAST(contact_name as BINARY) USING utf8) AS contact_name,
      CONVERT(CAST(contact_number as BINARY) USING utf8) AS contact_number,
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

      const cachedData = cache.get("churches");

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

    const data = result.map((item) => {
      const {
        churchID,
        church_name,
        church_URL,
        identifying_place,
        country_iso,
        isActive,
      } = item;

      return {
        id: churchID,
        name: church_name,
        url: church_URL,
        place: identifying_place,
        country: country_iso,
        isActive: isActive,
      };
    });

    const oneWeek = 604800;
    cache.set("churches", data, oneWeek);

    return res.status(200).send({
      msg: "churches retrieved",
      msgType: "success",
      churches: data,
    });
  });
};

exports.FETCH = async () => {
  const NodeCache = require("node-cache");
  const cache = new NodeCache();
  const db = require("../../database-services");

  const sql = `
    SELECT 
      churchID,
      isActive,
      CONVERT(CAST(church_name AS BINARY) USING utf8) AS church_name,
      church_URL,
      CONVERT(CAST(contact_name as BINARY) USING utf8) AS contact_name,
      CONVERT(CAST(contact_number as BINARY) USING utf8) AS contact_number,
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

  return new Promise((resolve, reject) => {
    db.query(sql, [], (err, result) => {
      if (err) {
        console.log(err);

        const cachedData = cache.get("churches");

        if (cachedData && cachedData.length) {
          return resolve(cachedData);
        }

        return reject(new Error("unable to query service for churches"));
      }

      const oneWeek = 604800;
      cache.set("churches", result, oneWeek);

      return resolve(result);
    });
  });
};
