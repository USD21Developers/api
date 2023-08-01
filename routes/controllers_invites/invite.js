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

  const notifySender = (
    eventObj,
    userObj,
    recipientObj,
    timezone,
    emailHtml,
    emailPhrases
  ) => {
    return new Promise((resolve, reject) => {
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
      let followUpLinkPrefix;
      const referer = req.headers["referer"];
      if (referer.indexOf("localhost") >= 0) {
        followUpLinkPrefix = "http://localhost:5555/recipient/#";
      } else if (referer.indexOf("staging") >= 0) {
        followUpLinkPrefix = "https://staging.invites.mobi/recipient/#";
      } else {
        followUpLinkPrefix = "https://invites.mobi/recipient/#";
      }
      const followUpLink = `${followUpLinkPrefix}/${recipientObj.recipientid}`;

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

        item.innerHTML = eval(key);
        item.removeAttribute("data-var");
      });

      // Match event data with template event vars
      document.querySelectorAll("[data-event]").forEach((item) => {
        const key = item.getAttribute("data-event");
        const val = eventObj[key];

        item.innerHTML = val;
        item.removeAttribute("data-event");
      });

      // Remaining variables
      let subject = emailPhrases["email-subject-viewed-invite"];
      subject = subject.replaceAll(
        "{RECIPIENT-NAME}",
        recipientObj.recipientname
      );
      subject = subject.replaceAll("{EVENT-TITLE}", eventObj.title);
      let body = document.body.innerHTML;
      body = body.replaceAll("{RECIPIENT-NAME}", recipientObj.recipientname);
      body = body.replaceAll("{EVENT-TITLE}", eventObj.title);
      body = body.replaceAll("{FOLLOW-UP-LINK}", followUpLink);

      const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${subject}</title>
  </head>
  <body>
    ${body}
  </body>
</html>  
      `.trim();

      resolve(html);
    });
  };

  // Main method
  (async (db, res) => {
    const event = eventid
      ? await getEvent(db, eventid).catch(() => null)
      : null;
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
    recipient.recipientid = recipientid;

    // Notify sender
    if (event && user && recipient) {
      notifySender(event, user, recipient, timezone, emailHtml, emailPhrases);
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
