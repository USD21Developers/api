exports.POST = (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["sysadmin", "user"];
  let isAuthorized = false;
  if (allowedUsertypes.includes(usertype)) isAuthorized = true;
  if (req.user.may_create_coupons) isAuthorized = true;
  if (!isAuthorized) {
    console.log(`User (userid ${req.user.userid}) is not authorized.`);
    return res.status(401).send({
      msg: "user is not authorized for this action",
      msgType: "error",
    });
  }

  // Set database
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Get request params
  const eventid = req.body.eventid || "";

  // Check if event exists

  const sql = `
    SELECT
      eventid,
      createdBy
    FROM
      events
    WHERE
      eventid = ?
    LIMIT
      1
    ;
  `;

  db.query(sql, [eventid], (error, result) => {
    if (error) {
      console.log(error);
      return res
        .status(500)
        .send({ msg: "unable to query for event", msgType: "error", error: error });
    }

    if (!result.length) {
      return res.status(404).send({ msg: "event not found", msgType: "error" });
    }

    const eventid = result[0].eventid;
    const createdBy = result[0].createdBy;

    // Ensure that user created this event

    if (createdBy !== req.user.userid) {
      return res.status(404).send({ msg: "event not created by user", msgType: "error" });
    }

    // Check if any recipients have already been invited to this event

    const sql = `
      SELECT
        invitationid
      FROM
        invitations
      WHERE
        eventid = ?
      LIMIT
        1
      ;
    `;

    db.query(sql, [eventid], (error, result) => {
      if (error) {
        console.log(error);
        return res
          .status(500)
          .send({ msg: "unable to query for invites sent for this event", msgType: "error" });
      }

      const someoneWasInvitedToEvent = result.length || false;
      let sql = "";

      if (someoneWasInvitedToEvent) {
        sql = `
          UPDATE
            events
          SET
            isDeleted = 1
          WHERE
            eventid = ?
          ;
        `;
      } else {
        sql = `
          DELETE FROM
            events
          WHERE
            eventid = ?
          ;
        `;
      }

      db.query(sql, [eventid], async (error, result) => {
        if (error) {
          console.log(error);
          return res
            .status(500)
            .send({ msg: "unable to delete event", msgType: "error" });
        }

        const getEventsByUser = require("../controllers_invites/utils").getEventsByUser;
        const events = await getEventsByUser(db, req.user.userid).catch((error) => {
          console.log(error);
          return res.status(500).send({ msg: "unable to return events", msgType: "error" });
        });

        return res.status(200).send({ msg: "event deleted", msgType: "success", events: events });
      });
    });
  })
};
