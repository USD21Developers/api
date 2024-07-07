const moment = require("moment");
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
  const fromDateTime = req.body.fromDateTime || null;
  const toDateTime = req.body.toDateTime || null;

  // Validate
  if (!moment(fromDateTime).isValid()) {
    return res.status(400).send({
      msg: "invalid value for fromDateTime",
      msgType: "error",
    });
  }
  if (!moment(toDateTime).isValid()) {
    return res.status(400).send({
      msg: "invalid value for toDateTime",
      msgType: "error",
    });
  }

  const getUserInvites = (db, fromDateTime, toDateTime) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          invitationid,
          eventid,
          ST_Y(sharedFromCoordinates) AS lat,
          ST_X(sharedFromCoordinates) AS lng,
          invitedAt
        FROM
          invitations
        WHERE
          userid = ?
        AND
          isDeleted = 0
        AND
          sharedFromCoordinates IS NOT NULL
        AND
          invitedAt >= ?
        AND
          invitedAt <= ?
        ORDER BY
          invitedAt ASC
        ;
      `;

      db.query(
        sql,
        [req.user.userid, fromDateTime, toDateTime],
        (error, result) => {
          if (error) {
            return reject(new Error(error));
          }

          return resolve(result);
        }
      );
    });
  };

  const getOthersInvites = (db, fromDateTime, toDateTime) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          ST_Y(sharedFromCoordinates) AS lat,
          ST_X(sharedFromCoordinates) AS lng,
          invitedAt
        FROM
          invitations
        WHERE
          userid <> ?
        AND
          isDeleted = 0
        AND
          sharedFromCoordinates IS NOT NULL
        AND
          invitedAt >= ?
        AND
          invitedAt <= ?
        ORDER BY
          invitedAt ASC
        ;
      `;

      db.query(
        sql,
        [req.user.userid, fromDateTime, toDateTime],
        (error, result) => {
          if (error) {
            return reject(new Error(error));
          }

          return resolve(result);
        }
      );
    });
  };

  const getUserEvents = (db, userInvites) => {
    return new Promise(async (resolve, reject) => {
      const userEventIds = userInvites.map((invite) => invite.eventid);
      const userEventIdsSet = new Set(userEventIds);
      const userEventIdsArray = Array.from(userEventIdsSet);

      const userEvents = await utils.getSpecificEvents(db, userEventIdsArray);

      return resolve(userEvents);
    });
  };

  const othersInvites = await getOthersInvites(db, fromDateTime, toDateTime);
  const userInvites = await getUserInvites(db, fromDateTime, toDateTime);
  const userEvents = await getUserEvents(db, userInvites);

  const searchResults = {
    othersInvites: othersInvites,
    userInvites: userInvites,
    userEvents: userEvents,
    dateTimeUTCFrom: fromDateTime,
    dateTimeUTCTo: toDateTime,
  };

  return res.status(200).send({
    msg: "evangelism map results retrieved",
    msgType: "success",
    searchResults: searchResults,
  });
};
