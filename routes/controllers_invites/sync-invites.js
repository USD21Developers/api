const moment = require("moment");

exports.POST = (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["sysadmin", "user"];
  let isAuthorized = false;
  if (allowedUsertypes.includes(usertype)) isAuthorized = true;
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

  // Params
  const unsyncedInvites = req.body.unsyncedInvites || [];

  // Validate:  unsyncedInvites must be an array
  if (!Array.isArray(unsyncedInvites)) {
    return res.status(400).send({
      msg: "unsyncedInvites must be an array",
      msgType: "error",
    });
  }

  let unsyncedInvitesLength = unsyncedInvites.length;

  // Validate:  eventid must be a valid integer
  if (unsyncedInvitesLength) {
    let validInteger = true;
    for (i = 0; i < unsyncedInvitesLength; i++) {
      const invite = unsyncedInvites[i];
      if (isNaN(invite.eventid)) {
        validInteger = false;
        break;
      }
    }
    if (!validInteger) {
      return res.status(400).send({
        msg: "eventid for each unsent invite must be a valid integer",
        msgType: "error",
      });
    }
  }

  // Query to store unsynced invites
  function saveUnsyncedInvites() {
    return new Promise((resolve, reject) => {
      const values = unsyncedInvites.map((item) => {
        const { eventid, sentvia, coords, utctime, timezone, recipient } = item;
        const timeMomentObj = moment.utc(utctime);
        const invitedAt = timeMomentObj.format("YYYY-MM-DD HH:mm:ss");
        const createdAt = moment.utc().format("YYYY-MM-DD HH:mm:ss");

        const {
          id: recipientid,
          name: recipientname,
          sms: recipientsms,
          email: recipientemail,
        } = recipient;
        let point = null;
        if (coords !== null) {
          const { lat, long } = coordinates;
          point = `ST_GeomFromText( POINT(${lat} ${long}) )`;
        }

        const encryptedSms = recipientsms ? JSON.stringify(recipientsms) : null;
        const encryptedEmail = recipientemail
          ? JSON.stringify(recipientemail)
          : null;

        const value = [
          eventid,
          req.user.userid,
          recipientid,
          recipientname,
          encryptedSms,
          encryptedEmail,
          sentvia,
          point,
          timezone,
          req.user.lang,
          invitedAt,
          createdAt,
        ];
        return value;
      });

      const sql = `
        REPLACE INTO invitations(
          eventid,
          userid,
          recipientid,
          recipientname,
          recipientsms,
          recipientemail,
          sharedvia,
          sharedfromcoordinates,
          sharedfromtimezone,
          lang,
          invitedAt,
          createdAt
        ) VALUES 
          ?
        ;
      `;

      db.query(sql, [values], (err, result) => {
        if (err) {
          console.log(err);
          return res.status(500).send({
            msg: "unable to insert unsyncedInvites",
            msgType: "error",
          });
        }

        getInvites(req.user.userid).then((invites) => {
          return res.status(200).send({
            msg: "invites synced",
            msgType: "success",
            invites: invites,
          });
        });
      });
    });
  }

  // Query to retrieve invites
  function getInvites() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          eventid,
          recipientid,
          recipientname,
          recipientsms,
          recipientemail,
          sharedvia,
          sharedfromcoordinates,
          sharedfromtimezone,
          invitedAt          
        FROM
          invitations
        WHERE
          userid = ?
        ORDER BY invitationid
        ;
      `;
      db.query(sql, [req.user.userid], (error, result) => {
        if (error) {
          const errorMessage = "unable to query for invites";
          console.log(`${errMessage}:`, error);
          return reject(new Error(errorMessage, error));
        }

        const invites = result.map((item) => {
          const {
            eventid,
            recipientid,
            recipientname,
            recipientsms,
            recipientemail,
            sharedvia,
            sharedfromcoordinates,
            sharedfromtimezone,
            invitedAt,
          } = item;

          const utctime = moment(invitedAt).format("YYYY-MM-DDTHH:mm:ss");

          const invite = {
            eventid: eventid,
            recipient: {
              id: recipientid,
              name: recipientname,
              sms: recipientsms,
              email: recipientemail,
            },
            sentvia: sharedvia,
            coords: sharedfromcoordinates,
            utctime: utctime,
            timezone: sharedfromtimezone,
          };

          return invite;
        });

        resolve(invites);
      });
    });
  }

  if (unsyncedInvitesLength) {
    saveUnsyncedInvites(unsyncedInvites).then(() => {
      getInvites().then((invites) => {
        return res.status(200).send({
          msg: "invites synced",
          msgType: "success",
          invites: invites,
        });
      });
    });
  } else {
    getInvites().then((invites) => {
      return res.status(200).send({
        msg: "invites synced",
        msgType: "success",
        invites: invites,
      });
    });
  }
};
