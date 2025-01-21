exports.GET = async (req, res) => {
  // Set database
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  const sql = `
    SELECT 
      DISTINCT u.churchid,
      c.name,
      c.place,
      c.country,
      c.url
    FROM users u
    INNER JOIN churches c ON u.churchid = c.remoteid
    WHERE
      u.churchid > 0
    AND
      u.userstatus = 'registered'
    AND
      c.isDeleted <> 1
    ORDER BY
      country, place, name
    ;
  `;

  db.query(sql, [], (error, result) => {
    if (error) {
      return res.status(500).send({
        msg: "unable to query for churches with users",
        msgType: "error"
      });
    }

    return res.status(200).send({
      msg: "churches with users retrieved",
      msgType: "success",
      churches: result
    });
  })
};
