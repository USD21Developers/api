const moment = require("moment");
const { getSpecificEvents } = require("./utils");
const utils = require("./utils");

exports.POST = async (req, res) => {
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
  function saveUnsyncedInvites(unsyncedInvites) {
    const unsyncedInvitePromises = unsyncedInvites.map((item) => {
      return new Promise((resolve, reject) => {
        const {
          eventid,
          followup,
          sentvia,
          coords,
          utctime,
          timezone,
          recipient,
        } = item;
        const timeMomentObj = moment.utc(utctime);
        const invitedAt = timeMomentObj.format("YYYY-MM-DD HH:mm:ss");
        const createdAt = moment.utc().format("YYYY-MM-DD HH:mm:ss");
        const {
          id: recipientid,
          name: recipientname,
          sms: recipientsms,
          email: recipientemail,
        } = recipient;
        const pointCoords = coords ? `POINT( ${lat} ${long} )` : null;
        const encryptedSms = recipientsms ? JSON.stringify(recipientsms) : null;
        const encryptedEmail = recipientemail
          ? JSON.stringify(recipientemail)
          : null;

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
            followup,
            invitedAt,
            createdAt
          ) VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ST_GeomFromText( ? ),
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `;

        db.query(
          sql,
          [
            eventid,
            req.user.userid,
            recipientid,
            recipientname,
            encryptedSms,
            encryptedEmail,
            sentvia,
            pointCoords,
            timezone,
            req.user.lang,
            followup,
            invitedAt,
            createdAt,
          ],
          (error, result) => {
            if (error) {
              console.log(error);
              return reject(error);
            }

            return resolve();
          }
        );
      });
    });

    Promise.allSettled(unsyncedInvitePromises, (values) => {
      return Promise.resolve(values);
    }).catch((err) => {
      console.log(err);
      return Promise.reject(err);
    });
  }

  // Query to retrieve interactions
  function getInteractions(invitationids) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          interactionid AS id,
          invitationid,
          recipienttimezone,
          interactiontype AS action,
          DATE_FORMAT(createdAt, '%Y-%m-%dT%TZ') AS utcdate
        FROM
          interactions
        WHERE
          invitationid IN (?)
        ORDER BY
          createdAt ASC
        ;
      `;

      db.query(sql, [invitationids], (error, result) => {
        if (error) {
          console.log(error);
          return reject(error);
        }

        return resolve(result);
      });
    });
  }

  // Query to retrieve invites
  function getInvites() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          invitationid,
          eventid,
          followup,
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
            invitationid,
            eventid,
            followup,
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
            invitationid: invitationid,
            eventid: eventid,
            followup: followup,
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
    await saveUnsyncedInvites(unsyncedInvites);
    const invites = await getInvites();
    return res.status(200).send({
      msg: "invites synced",
      msgType: "success",
      invites: invites,
    });
  } else {
    getInvites().then(async (invites) => {
      let interactions = [];
      let eventsFromMyInvites = [];

      if (invites.length) {
        const invitationidset = Array.from(
          new Set(invites.map((item) => item.invitationid).sort())
        );

        const invitationids = [];
        for (let i = 0; i < invitationidset.length; i++) {
          invitationids.push(invitationidset[i]);
        }

        interactions = Array.isArray(invitationids)
          ? await getInteractions(invitationids)
          : [];

        const events = await utils.getSpecificEvents(db, invitationids);

        eventsFromMyInvites = Array.isArray(events) ? events : [];
      }

      return res.status(200).send({
        msg: "invites synced",
        msgType: "success",
        invites: invites,
        interactions: interactions,
        eventsFromMyInvites: eventsFromMyInvites,
      });
    });
  }
};
