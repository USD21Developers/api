exports.GET = (req, res) => {
  const db = require("../../database-services");

  const sql = `
    SELECT 
      churchID,
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
      } = item;

      return {
        id: churchID,
        name: church_name,
        url: church_URL,
        place: identifying_place,
        country: country_iso,
      };
    });

    return res.status(200).send({
      msg: "churches retrieved",
      msgType: "success",
      churches: data,
    });
  });
};

exports.FETCH = async () => {
  const db = require("../../database-services");

  const sql = `
    SELECT 
      churchID,
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
        return reject(new Error("unable to query service for churches"));
      }

      resolve(result);
    });
  });
};
