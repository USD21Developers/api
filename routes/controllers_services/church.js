exports.GET = (req, res) => {
  const NodeCache = require("node-cache");
  const cache = new NodeCache();
  let churchid = req.params["churchid"];
  const db = require("../../database-services");

  churchid = Math.abs(parseInt(churchid));

  const cachedChurchId = `church_${churchid}`;

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
    WHERE
      churchID = ?
    LIMIT 1
    ;
  `;

  db.query(sql, [churchid], (err, result) => {
    if (err) {
      console.log(err);

      const cachedChurch = cache.get(cachedChurchId);
      if (cachedChurch && cachedChurch.hasOwnProperty("churchID")) {
        return res.status(200).send({
          msg: "church info retrieved",
          msgType: "success",
          info: cachedChurch,
        });
      }

      return res.status(500).send({
        msg: "unable to query for church",
        msgType: "error",
        churchid: churchid,
      });
    }

    if (!result.length) {
      return res.status(404).send({
        msg: "church not found",
        msgType: "error",
        churchid: churchid,
      });
    }

    const oneWeek = 604800;
    cache.set(cachedChurchId, result[0], oneWeek);

    return res.status(200).send({
      msg: "church info retrieved",
      msgType: "success",
      info: result[0],
    });
  });
};
