const moment = require("moment");

exports.POST = (req, res) => {
  // Set database
  const isStaging =
    req.headers?.referer?.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  const eventid = Number(req.body.eventid) || null;
  const userid = Number(req.body.userid) || null;
  const recipientid = req.body.recipientid || null;
  const timezone = req.body.timezone || null;
  const emailHtml = req.body.emailHtml || null;
  const emailPhrases = req.body.emailPhrases || null;
  const loadedAlready = req.body.loadedAlready || false;
  const isUser = req.body.isUser || false;

  // Validate eventid
  if (!eventid) {
    return res.status(400).send({
      msg: "eventid is required",
      msgType: "error",
    });
  }
  if (typeof eventid !== "number") {
    return res.status(400).send({
      msg: "eventid must be numeric",
      msgType: "error",
    });
  }

  const getUnsubscribeToken = async (recipientid, userid) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          invitationid,
          userid
        FROM
          invitations
        WHERE
          recipientid = ?
        AND
          userid = ?
        LIMIT 1
        ;
      `;
      db.query(sql, [recipientid, userid], (error, result) => {
        if (error) {
          console.log(error);
          return reject(error);
        }

        if (!result.length) {
          return reject(
            new Error("an invitation with this userid was not found")
          );
        }

        const invitationid = result[0].invitationid;
        const userid = result[0].userid;
        const secret = process.env.INVITES_HMAC_SECRET;
        const jsonwebtoken = require("jsonwebtoken");
        const jwt = jsonwebtoken.sign(
          {
            invitationid: invitationid,
            userid: userid,
          },
          secret,
          { expiresIn: "100y" }
        );
        const unsubscribeToken = Buffer.from(jwt).toString("base64");

        return resolve(unsubscribeToken);
      });
    });
  };

  const getEvent = (db, eventid) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          *,
          CASE 
            WHEN frequency != 'once' AND startdate < CURDATE() THEN CONCAT(DATE_FORMAT(DATE_ADD(startdate, INTERVAL (DATEDIFF(CURDATE(), startdate) DIV 7 + 1) * 7 DAY), '%Y-%m-%dT%H:%i:%s'), 'Z')
            ELSE CONCAT(DATE_FORMAT(startdate, '%Y-%m-%dT%H:%i:%s'), 'Z')
          END AS startdateNext,
          (
            SELECT COUNT(*)
            FROM events 
            WHERE eventid = ? 
            AND (
              DATE_ADD(startdate, INTERVAL durationInHours HOUR) < NOW() 
              OR 
              multidayenddate < NOW()
            )
          ) AS isPast
        FROM
          events
        WHERE
          eventid = ?
        LIMIT
          1
        ;
      `;

      db.query(sql, [eventid, eventid, eventid], (error, result) => {
        if (error) {
          console.log(error);
          return reject(new Error("unable to query for event"));
        }

        if (!result.length) {
          return reject(new Error("event not found"));
        }

        const removeLocationInfoFromDiscreetEvents =
          require("./utils").removeLocationInfoFromDiscreetEvents;

        let event;

        event = removeLocationInfoFromDiscreetEvents(result);

        return resolve(event[0]);
      });
    });
  };

  const getUser = (db, userid) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          userid,
          churchid,
          firstname,
          lastname,
          email,
          gender,
          profilephoto,
          lang,
          country
        FROM
          users
        WHERE
          userid = ?
        ;
      `;

      db.query(sql, [userid], (error, result) => {
        if (error) {
          console.log(error);
          return reject(new Error("unable to query for user"));
        }

        if (!result.length) {
          return reject(new Error("user not found"));
        }

        const userObject = result[0];

        return resolve(userObject);
      });
    });
  };

  const getRecipient = (db, eventid, userid, recipientid) => {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          invitationid,
          recipientname,
          sharedfromtimezone,
          lang,
          invitedAt
        FROM
          invitations
        WHERE
          eventid = ?
        AND
          userid = ?
        AND
          recipientid = ?
        LIMIT
          1
        ;
      `;

      db.query(sql, [eventid, userid, recipientid], (error, result) => {
        if (error) {
          console.log(error);
          return reject(new Error("unable to query for recipient"));
        }

        if (!result.length) {
          return reject(new Error("recipient not found"));
        }

        return resolve(result[0]);
      });
    });
  };

  const recordThatInviteWasViewed = function (
    invitationid,
    userid,
    timezone,
    loadedAlready,
    isUser
  ) {
    return new Promise((resolve, reject) => {
      const interactionType = "viewed invite";

      if (loadedAlready) return resolve();
      if (isUser) return resolve();
      if (!invitationid)
        return reject(new Error("invitationid is a required argument"));
      if (!userid) return reject(new Error("userid is a required argument"));
      if (!timezone)
        return reject(new Error("timezone is a required argument"));

      const sql = `
        INSERT INTO interactions(
          invitationid,
          userid,
          recipienttimezone,
          interactiontype,
          createdAt
        ) VALUES (
          ?,
          ?,
          ?,
          ?,
          UTC_TIMESTAMP()
        )
      `;

      db.query(
        sql,
        [invitationid, userid, timezone, interactionType],
        (error, result) => {
          if (error) {
            console.log(error);
            return reject(new Error("unable to record that invite was viewed"));
          }

          return resolve(result);
        }
      );
    });
  };

  const notifySender = (
    eventObj,
    userObj,
    recipientObj,
    timezone,
    emailHtml,
    emailPhrases,
    isUser
  ) => {
    return new Promise(async (resolve, reject) => {
      if (!eventObj) return resolve();
      if (!userObj) return resolve();
      if (!recipientObj) return resolve();
      if (isUser) return resolve();

      const crypto = require("crypto");
      const messageID = crypto.randomUUID();
      const userLocale = `${eventObj.lang}-${eventObj.country.toUpperCase()}`;
      const dateTimeNow = new Intl.DateTimeFormat(userLocale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        timeZone: eventObj.timezone,
      }).format(new Date(Date.now()));
      const dateTimeSent = new Intl.DateTimeFormat(userLocale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        timeZone: eventObj.timezone,
      }).format(new Date(recipientObj.invitedAt));
      let eventDateTime;
      const isRecurringEvent = eventObj.frequency === "once" ? false : true;
      const isMultiDay = eventObj.multidaybegindate ? true : false;
      let domain;
      let followUpLinkPrefix;
      const referer = req.headers["referer"];
      if (referer.indexOf("localhost") >= 0) {
        domain = "http://localhost:5555";
      } else if (referer.indexOf("staging") >= 0) {
        domain = "https://staging.invites.mobi";
      } else {
        domain = "https://invites.mobi";
      }
      followUpLinkPrefix = `${domain}/r/#`;
      const followUpLink = `${followUpLinkPrefix}/${recipientObj.invitationid}`;

      if (isRecurringEvent) {
        eventDateTime = new Intl.DateTimeFormat(userLocale, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
          timeZone: eventObj.timezone,
        }).format(new Date(eventObj.startdate));
      } else if (!isMultiDay) {
        eventDateTime = new Intl.DateTimeFormat(userLocale, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
          timeZone: eventObj.timezone,
        }).format(new Date(eventObj.startdate));
      } else if (isMultiDay) {
        const fromDateTime = new Intl.DateTimeFormat(userLocale, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
          timeZone: eventObj.timezone,
        }).format(new Date(eventObj.startdate));
        const toDateTime = new Intl.DateTimeFormat(userLocale, {
          weekday: "short",
          month: "sort",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
          timeZone: eventObj.timezone,
        }).format(new Date(eventObj.enddate));

        eventDateTime = `${fromDateTime} - ${toDateTime}`;
      }

      const jsdom = require("jsdom");
      const { JSDOM } = jsdom;
      const { document } = new JSDOM(emailHtml).window;

      let latitude;
      let longitude;

      if (eventObj.hasOwnProperty("locationcoordinates")) {
        if (eventObj.locationcoordinates.hasOwnProperty("x")) {
          longitude = eventObj.locationcoordinates.x;
        }

        if (eventObj.locationcoordinates.hasOwnProperty("y")) {
          latitude = eventObj.locationcoordinates.y;
        }
      }

      document.title = emailPhrases["email-subject-viewed-invite"]
        .replaceAll("{RECIPIENT-NAME}", recipientObj.recipientname)
        .replaceAll("{EVENT-TITLE}", eventObj.title);

      // Match i18n keys with template keys
      document.querySelectorAll("[data-i18n]").forEach((item) => {
        const key = item.getAttribute("data-i18n");
        const val = emailPhrases[key];

        item.innerHTML = val;
        item.removeAttribute("data-i18n");
      });

      // Match vars with template vars
      document.querySelectorAll("[data-var]").forEach((item) => {
        const key = item.getAttribute("data-var");

        if (key === "messageID") {
          item.innerHTML = messageID;
        } else {
          item.innerHTML = eval(key);
        }

        item.removeAttribute("data-var");
      });

      // Match event data with template event vars
      document.querySelectorAll("[data-event]").forEach((item) => {
        const key = item.getAttribute("data-event");
        const val = eventObj[key];

        item.innerHTML = val;
        item.removeAttribute("data-event");
      });

      // Populate the unsubscribe link
      const unsubscribeToken = await getUnsubscribeToken(recipientid, userid);
      const unsubscribeLink = `${domain}/unsubscribe/?${unsubscribeToken}`;
      document
        .querySelector("#unsubscribe")
        .setAttribute("href", unsubscribeLink);

      // Remaining variables
      const viewInviteLinkEl = document.querySelector("#viewInviteLink");
      if (viewInviteLinkEl) {
        if (latitude && longitude) {
          const viewInviteLink = `https://www.google.com/maps/search/?api=1&query=${latitude}%2C${longitude}`;
          if (viewInviteLinkEl.hasAttribute("href")) {
            viewInviteLinkEl.setAttribute("href", viewInviteLink);
          }
        } else {
          viewInviteLinkEl.remove();
        }
      }

      let subject = emailPhrases["email-subject-viewed-invite"];
      subject = subject.replaceAll(
        "{RECIPIENT-NAME}",
        recipientObj.recipientname
      );
      subject = subject.replaceAll("{EVENT-TITLE}", eventObj.title);
      let body = document.body.innerHTML;
      body = body.replaceAll("{RECIPIENT-NAME}", recipientObj.recipientname);

      if (eventObj.isDeleted === 1) {
        const deletedColor = "#f44336"; // On front end, corresponds to the color for "--var(danger)"
        const isDeleted = emailPhrases["email-event-is-deleted"] || "";
        const eventIsDeletedHTML = `
          <strike style="color: ${deletedColor}">${eventObj.title}</strike></a>
          <span style="white-space: nowrap">
            &nbsp;
            <span style="color: ${deletedColor}">${isDeleted}</span>
          </span>
        `;
        body = body.replaceAll("{EVENT-TITLE}", eventIsDeletedHTML);
      } else {
        body = body.replaceAll("{EVENT-TITLE}", eventObj.title);
      }

      body = body.replaceAll("{FOLLOW-UP-LINK}", followUpLink);
      body = body.replaceAll("{EVENT-TIMEZONE}", eventObj.timezone);

      const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${subject}</title>
  </head>
  <body id="invitesemail">
    ${body}
  </body>
</html>  
      `.trim();

      // TODO:  Send the sender a notification via push message

      const sql = `
        SELECT
          i.invitationid,
          i.unsubscribedFromEmail,
          i.lasttimenotified,
          u.settings
        FROM
          invitations i
        INNER JOIN users u ON u.userid = i.userid
        WHERE
          i.invitationid = ?
        LIMIT
          1
      `;

      db.query(sql, [recipientObj.invitationid], async (error, result) => {
        if (error) {
          console.log(error);
          return reject(
            new Error(
              "unable to query for last time user was notified about this invite"
            )
          );
        }

        if (!result.length) {
          return reject(
            new Error(
              `invite not found { eventid: ${eventObj.eventid}, userid: ${userObj.userid}, recipientid: ${recipientObj.recipientid} }`
            )
          );
        }

        const invitationid = result[0].invitationid;
        const lastTimeNotified = result[0].lasttimenotified || null;
        const unsubscribedFromEmail = result[0].unsubscribedFromEmail || null;
        const settings = result[0].settings || null;

        let proceedWithNotification = true;

        if (lastTimeNotified) {
          const now = moment().utc();
          const notified = moment(lastTimeNotified);
          const okToNotifiy = notified.add(24, "hours");

          if (now.isBefore(okToNotifiy)) {
            proceedWithNotification = false;
          }
        }

        if (unsubscribedFromEmail && unsubscribedFromEmail === 1) {
          proceedWithNotification = false;
        }

        if (
          settings &&
          settings.hasOwnProperty("enableEmailNotifications") &&
          settings.enableEmailNotifications === 0
        ) {
          proceedWithNotification = false;
        }

        if (!proceedWithNotification) {
          return resolve();
        }

        const sendEmail = require("./utils").sendEmail;

        const to = `${userObj.firstname} ${userObj.lastname} <${userObj.email}>`;
        const from = "invites.mobi";

        const emailResult = await sendEmail(to, from, subject, html);
        const emailSucceeded =
          emailResult[0].statusCode >= 200 && emailResult[0].statusCode < 300
            ? true
            : false;

        if (emailSucceeded) {
          const sql = `
              UPDATE
                invitations
              SET
                lasttimenotified = UTC_TIMESTAMP()
              WHERE
                invitationid = ?
              ;
            `;

          db.query(sql, [invitationid], (error, result) => {
            if (error) {
              console.log(error);
              return reject(
                new Error(
                  "unable to invite with last time user was notified via e-mail"
                )
              );
            }

            return resolve(emailResult);
          });
        } else {
          return reject(emailResult);
        }
      });
    });
  };

  // Main method
  (async (db, res) => {
    const event = eventid
      ? await getEvent(db, eventid).catch(() => null)
      : null;

    if (!event) {
      return res.status(404).send({
        msg: "event not found",
        msgType: "error",
      });
    }

    if (event.frequency !== "once") {
      event.startDateOriginal =
        moment(event.startdate).format("YYYY-MM-DDTHH:mm:ss") + "Z";
      event.startdate = event.startdateNext;
      delete event.startdateNext;
    }
    const user = userid ? await getUser(db, userid).catch(() => null) : null;
    const recipient =
      eventid && userid && recipientid
        ? await getRecipient(db, eventid, userid, recipientid).catch(() => null)
        : null;
    // if (recipient) recipient.invitationid = recipientid;

    // Record that invite was viewed
    if (recipient) {
      recordThatInviteWasViewed(
        recipient.invitationid,
        userid,
        timezone,
        loadedAlready,
        isUser
      );
    }

    // Notify sender
    if (event && user && recipient) {
      return notifySender(
        event,
        user,
        recipient,
        timezone,
        emailHtml,
        emailPhrases,
        isUser
      )
        .catch((err) => {
          console.log(err);
        })
        .finally(() => {
          delete recipient.invitationid;
          delete user.email;
          delete user.lastname;

          res.status(200).send({
            msg: "invite retrieved",
            msgType: "success",
            invite: {
              event: event,
              user: user,
              recipient: recipient,
            },
          });
        });
    }

    return res.status(200).send({
      msg: "invite retrieved",
      msgType: "success",
      invite: {
        event: event,
        user: user,
        recipient: recipient,
      },
    });
  })(db, res);
};
