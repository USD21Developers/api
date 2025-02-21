exports.GET = async (req, res) => {
  // Set cache
  const NodeCache = require("node-cache");
  const cache = new NodeCache();

  // Set database
  const isStaging = req?.headers?.referer?.indexOf("staging") >= 0 || false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Get churches
  const sql = `
    SELECT
      remoteid AS id,
      name,
      place,
      country,
      url,
      isDeleted
    FROM
      churches
    ORDER BY
      country,
      place,
      name
    ;
  `;

  db.query(sql, [], (error, result) => {
    if (error) {
      return res.status(500).send({
        msg: "unable to query for churches",
        msgType: "error",
      });
    }

    const oneWeek = 604800;
    cache.set("churches", result, oneWeek);

    const churches = result;

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
        u.isAuthorized = 1
      AND
        c.isDeleted <> 1
      ORDER BY
        country, place, name
      ;
    `;

    db.query(sql, [], (error, result) => {
      if (error) {
        console.log(error);
        return res.status(500).send({
          msg: "unable to query for churches with registered users",
          msgType: "error",
        });
      }

      const churchesWithRegisteredUsers = result;

      return res.status(200).send({
        msg: "churches retrieved",
        msgType: "success",
        churches: churches,
        churchesWithRegisteredUsers: churchesWithRegisteredUsers,
      });
    });
  });
};
