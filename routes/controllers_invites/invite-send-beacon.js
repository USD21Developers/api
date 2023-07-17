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
          .send({ msg: "invalid access token", msgType: "error", err: err });
      }

      const { eventid, sentvia, coords, utctime, timezone, recipient } = invite;

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
        return res.status(401).send({
          msg: "user is not authorized for this action",
          msgType: "error",
        });
      }

      const timeMomentObj = moment.utc(utctime);
      const invitedAt = timeMomentObj.format("YYYY-MM-DD HH:mm:ss");
      const createdAt = moment.utc().format("YYYY-MM-DD HH:mm:ss");
      let point = null;
      if (coords !== null) {
        const { lat, long } = coords;
        point = `ST_GeomFromText("POINT(${lat} ${long})")`;
      }

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
          invitedAt,
          createdAt
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        );
      `;

      db.query(
        sql,
        [
          eventid,
          userid,
          recipientid,
          recipientname,
          encryptedSms,
          encryptedEmail,
          sentvia,
          point,
          timezone,
          lang,
          invitedAt,
          createdAt,
        ],
        (err, result) => {
          if (err) {
            console.log(err);
            return res.status(500).send({
              msg: "unable to save invite via sendBeacon",
              msgType: "error",
            });
          }

          return res.status(200).send({
            msg: "invite successfully saved via sendBeacon",
            msgType: "success",
          });
        }
      );
    }
  );
};
