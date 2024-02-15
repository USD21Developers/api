function fixPoint(db, item) {
  return new Promise((resolve, reject) => {
    const { eventid, locationcoordinates } = item;
    const { x, y } = locationcoordinates;
    const longitude = y;
    const latitude = x;
    const sql = `
      UPDATE
        events
      SET
        locationcoordinates = POINT(?,?)
      WHERE
        eventid = ?
      ;
    `;

    db.query(sql, [longitude, latitude, eventid], (error, result) => {
      if (error) {
        console.log(error);
        return reject(error);
      }

      return resolve(eventid);
    });
  });
}

exports.POST = async (req, res) => {
  // Set database
  const isStaging =
    req.headers?.referer?.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  const sql = `
    SELECT
      eventid,
      locationcoordinates
    FROM
      EVENTS
    ;
  `;

  db.query(sql, [], (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).send({
        msg: "unable to query for map test",
        msgType: "error",
      });
    }

    const promises = [];

    result.forEach((item) => {
      const promise = fixPoint(db, item);
      promises.push(promise);
    });

    Promise.all(promises).then((eventids) => {
      return res.status(200).send({
        msg: "map test succeeded",
        msgType: "success",
        eventids: eventids,
      });
    });
  });
};
