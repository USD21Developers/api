exports.POST = (req, res) => {
  // Set database
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  const { accessToken, invite } = JSON.parse(req.body);

  const jsonwebtoken = require("jsonwebtoken");
  const moment = require("moment");

  jsonwebtoken.verify(
    accessToken,
    process.env.ACCESS_TOKEN_SECRET,
    (err, userdata) => {
      if (err) {
        return res
          .status(403)
          .setHeader("Content-Type", "text/plain")
          .send("invalid access token");
      }

      let { eventid, followup, sentvia, coords, utctime, timezone, recipient } =
        invite;

      if (sentvia === "qrcode") followup = 0;

      const {
        id: recipientid,
        name: recipientname,
        sms: recipientsms,
        email: recipientemail,
      } = recipient;

      const {
        churchid,
        userid,
        usertype,
        user,
        lang,
        en,
        profilephoto,
        country,
        passwordmustchange,
        isAuthorized,
        canAuthorize,
        canAuthToAuth,
        iat,
        exp,
      } = userdata;

      // Enforce authorization
      let isAuthorizedInThisRoute = false;
      const allowedUsertypes = ["sysadmin", "user"];
      if (allowedUsertypes.includes(userdata.usertype))
        isAuthorizedInThisRoute = true;
      // if (!userdata.isAuthorized) isAuthorizedInThisRoute = false;
      if (!isAuthorizedInThisRoute) {
        console.log(`User (userid ${userdata.userid}) is not authorized.`);
        return res
          .setHeader("Content-Type", "text/plain")
          .status(401)
          .send("user is not authorized for this action");
      }

      const timeMomentObj = moment.utc(utctime);
      const invitedAt = timeMomentObj.format("YYYY-MM-DD HH:mm:ss");
      const createdAt = moment.utc().format("YYYY-MM-DD HH:mm:ss");
      const pointCoords = coords
        ? `POINT( ${coords.lat} ${coords.long} )`
        : null;
      const encryptedSms = recipientsms ? JSON.stringify(recipientsms) : null;
      const encryptedEmail = recipientemail
        ? JSON.stringify(recipientemail)
        : null;

      const sql = `
        SELECT
          invitationid
        FROM
          invitations
        WHERE
          eventid = ?
        AND
          userid = ?
        AND
          recipientid = ?
        LIMIT 1
        ;
      `;

      db.query(sql, [eventid, userid, recipientid], (error, result) => {
        if (error) {
          console.log(error);
          return res
            .setHeader("Content-Type", "text/plain")
            .status(500)
            .send("unable to save invite via sendBeacon");
        }

        if (result.length) {
          const invitationid = result[0].invitationid;
          const sql = `
            UPDATE invitations
            SET
              eventid = ?,
              followup = ?,
              userid = ?,
              recipientid = ?,
              recipientname = ?,
              recipientsms = ?,
              recipientemail = ?,
              sharedvia = ?,
              sharedfromcoordinates = ?,
              sharedfromtimezone = ?,
              lang = ?,
              invitedAt = ?,
              createdAt = ?
            WHERE
              invitationid = ?
            ;
          `;

          db.query(
            sql,
            [
              eventid,
              followup,
              userid,
              recipientid,
              recipientname.trim(),
              encryptedSms,
              encryptedEmail,
              sentvia,
              pointCoords,
              timezone,
              lang,
              invitedAt,
              createdAt,
              invitationid,
            ],
            (error, result) => {
              if (error) {
                console.log(error);
                return res
                  .setHeader("Content-Type", "text/plain")
                  .status(500)
                  .send("unable to save invite via sendBeacon");
              }

              return res
                .setHeader("Content-Type", "text/plain")
                .status(200)
                .send("invite successfully saved via sendBeacon");
            }
          );
        } else {
          let sql = `
            INSERT IGNORE INTO invitations(
              eventid,
              followup,
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
            ) VALUES (
                ?,
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
                ?
            );
          `;

          db.query(
            sql,
            [
              eventid,
              followup,
              userdata.userid,
              recipientid,
              recipientname.trim(),
              encryptedSms,
              encryptedEmail,
              sentvia,
              pointCoords,
              timezone,
              userdata.lang,
              invitedAt,
              createdAt,
            ],
            (err, result) => {
              if (err) {
                console.log(err);
                return res
                  .setHeader("Content-Type", "text/plain")
                  .status(500)
                  .send("unable to save invite via sendBeacon");
              }

              return res
                .setHeader("Content-Type", "text/plain")
                .status(200)
                .send("invite successfully saved via sendBeacon");
            }
          );
        }
      });
    }
  );
};
