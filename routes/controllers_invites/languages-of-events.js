exports.POST = (req, res) => {
  // Set database
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Params
  const { eventid, userid, recipientid } = req.body;

  // Validate

  if (!eventid) {
    return res.status(400).send({
      msg: "eventid is required",
      msgType: "error",
    });
  }
  if (isNaN(eventid)) {
    return res.status(400).send({
      msg: "eventid must be numeric",
      msgType: "error",
    });
  }
  if (!userid) {
    return res.status(400).send({
      msg: "userid is required",
      msgType: "error",
    });
  }
  if (isNaN(userid)) {
    return res.status(400).send({
      msg: "userid must be numeric",
      msgType: "error",
    });
  }
  if (!recipientid || !recipientid.length) {
    return res.status(400).send({
      msg: "recipientid is required",
      msgType: "error",
    });
  }

  const sql = `
    SELECT DISTINCT
      lang
    FROM
      events
    WHERE
      isDeleted = 0
    ORDER BY
      lang ASC
    ;
  `;
  db.query(sql, [], (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).send({
        msg: "unable to query for languages of events",
        msgType: "error",
      });
    }

    const langs = result.map((item) => item.lang);

    return res.status(200).send({
      msg: "retrieved languages of events",
      msgType: "success",
      langs: langs,
    });
  });
};
