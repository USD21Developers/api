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

  const notifySender = (event, user, recipient, emailObject) => {
    return new Promise((resolve, reject) => {
      let emailPlainText = `
SUBJECT:  {RECIPIENT-NAME} viewed your invite

=========

BODY:

=========

{RECIPIENT-NAME} has viewed the invite you sent for the following event:


EVENT:
{EVENT-TITLE}
{EVENT-DATETIME}


INVITE VIEWED:
{DATE-VIEWED}


INVITE SENT:
{DATE-SENT}


Follow up with {RECIPIENT-NAME}:

https://invites.mobi/recipient/{INVITE-ID}

==========

About the Invites App:

https://invites.mobi/about/

==========

Message ID: {UUID}

==========      
      `;

      const userLocale = `${event.lang}-${event.country.toUpperCase()}`;
      const dateTimeNow = new Intl.DateTimeFormat(userLocale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        timeZone: event.timezone,
      }).format(new Date(Date.now()));
      const dateTimeSent = new Intl.DateTimeFormat(userLocale, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        timeZone: event.timezone,
      }).format(new Date(recipient.invitedAt));
      let eventDateTime;
      const isRecurringEvent = event.frequency === "once" ? false : true;
      const isMultiDay = event.multidaybegindate ? true : false;

      if (isRecurringEvent) {
        eventDateTime = new Intl.DateTimeFormat(userLocale, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
          timeZone: event.timezone,
        }).format(new Date(event.startdate));
      } else if (!isMultiDay) {
        eventDateTime = new Intl.DateTimeFormat(userLocale, {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
          timeZone: event.timezone,
        }).format(new Date(event.startdate));
      } else if (isMultiDay) {
        const fromDateTime = new Intl.DateTimeFormat(userLocale, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
          timeZone: event.timezone,
        }).format(new Date(event.startdate));
        const toDateTime = new Intl.DateTimeFormat(userLocale, {
          weekday: "short",
          month: "sort",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
          timeZone: event.timezone,
        }).format(new Date(event.enddate));

        eventDateTime = `${fromDateTime} - ${toDateTime}`;
      }

      emailPlainText = emailPlainText.replaceAll(
        "{RECIPIENT-NAME}",
        recipient.recipientname
      );
      emailPlainText = emailPlainText.replaceAll("{EVENT-TITLE}", event.title);
      emailPlainText = emailPlainText.replaceAll(
        "{EVENT-DATETIME}",
        eventDateTime
      );
      emailPlainText = emailPlainText.replaceAll("{DATE-VIEWED}", dateTimeNow);
      emailPlainText = emailPlainText.replaceAll("{DATE-SENT}", dateTimeSent);

      // TODO:  Send the e-mail

      resolve(emailPlainText);
    });
  };

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

    // Notify sender
    if (event && user && recipient) {
      notifySender(event, user, recipient);
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
