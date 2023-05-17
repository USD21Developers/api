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

  // Validate:  unsyncedInvites objects must have a valid shape
  if (unsyncedInvitesLength) {
    let validShape = true;
    for (i = 0; i < unsyncedInvitesLength; i++) {
      const invite = unsyncedInvites[i];
      if (!invite.event) {
        validShape = false;
        break;
      }
      if (!invite.sent.id || !invite.sent.lang) {
        validShape = false;
      }
      if (!invite.recipient) {
        validShape = false;
        break;
      }
      if (!invite.recipient.id || invite.recipient.name) {
        validShape = false;
        break;
      }
      if (
        !invite.recipient.hasOwnProperty("sms") ||
        !invite.recipient.hasOwnProperty("email")
      ) {
        validShape = false;
        break;
      }
      if (!invite.sent) {
        validShape = false;
        break;
      }
      if (
        !invite.sent.userid ||
        !invite.sent.userlang ||
        !invite.sent.time ||
        !invite.sent.timezone ||
        !invite.sent.coords ||
        !invite.sent.via
      ) {
        validShape = false;
        break;
      }
    }
    if (!validShape) {
      return res.status(400).send({
        msg: "unsentInvites must have a valid shape",
        msgType: "error",
      });
    }
  }

  // Validate:  valid integers are required for event id and user id
  if (unsyncedInvitesLength) {
    let validInteger = true;
    for (i = 0; i < unsyncedInvitesLength; i++) {
      const invite = unsyncedInvites[i];
      if (isNaN(invite.event.id) || isNaN(invite.sent.userid)) {
        validInteger = false;
        break;
      }
    }
    if (!validInteger) {
      return res.status(400).send({
        msg: "unsentInvites must have valid integers for both event id and user id",
        msgType: "error",
      });
    }
  }

  const utils = require("../controllers_invites/utils");
  const { getInvites } = utils;

  if (unsyncedInvitesLength) {
    // Query to store unsynced invites
    const sql = `
      INSERT INTO invitations(
        eventid,
        eventmetadata,
        userid,
        recipientid,
        recipientname,
        recipientsms,
        recipientemail,
        sharedvia,
        sharedfromcoordinates,
        lang,
        invitedAt,
        createdAt
      ) VALUES 
        ?
      ;
    `;

    const values = unsyncedInvites.map((item) => {
      const { event, recipient, sent } = item;
      const { id: eventid, lang: eventlang } = event;
      const {
        id: recipientid,
        name: recipientname,
        sms: recipientsms,
        email: recipientemail,
      } = recipient;
      const {
        userid,
        userlang,
        time: invitedAt,
        timezone,
        coords,
        via: sharedvia,
      } = sent;
      const eventmetadata = JSON.stringify({
        timezone: timezone,
        eventid: eventid,
        lang: eventlang,
      });
      let point = null;
      if (coords !== null) {
        const coordinates = coords.split(",");
        const lat = coordinates[0];
        const lng = coordinates[1];
        point = `ST_GeomFromText( POINT(${lat} ${lng}) )`;
      }
      const value = [
        eventid,
        eventmetadata,
        userid,
        recipientid,
        recipientname,
        recipientsms,
        recipientemail,
        sharedvia,
        point,
        userlang,
        invitedAt,
      ];
      return value;
    });

    db.query(sql, values, async (err, result) => {
      if (err) {
        console.log(err);
        return res
          .status(500)
          .send({ msg: "unable to insert unsyncedInvites", msgType: "error" });
      }

      getInvites(userid).then((invites) => {
        return res.status(200).send({
          msg: "invites synced",
          msgType: "success",
          invites: invites,
        });
      });
    });
  } else {
    getInvites(userid).then((invites) => {
      return res.status(200).send({
        msg: "invites synced",
        msgType: "success",
        invites: invites,
      });
    });
  }
};
