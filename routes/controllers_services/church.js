exports.GET = (req, res) => {
  let churchid = req.params["churchid"];
  const db = require("../../database-services");

  churchid = Math.abs(parseInt(churchid));

  const sql = `
    SELECT
      churchID,
      church_name,
      church_URL,
      contact_name,
      contact_number,
      identifying_place,
      country_iso
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

    return res.status(200).send({
      msg: "church info retrieved",
      msgType: "success",
      info: result[0],
    });
  });
};
