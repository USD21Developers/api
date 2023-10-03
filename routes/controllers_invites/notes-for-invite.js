exports.POST = (req, res) => {
  // Set database
  const isStaging =
    req.headers?.referer?.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Params
  const invitationid = req.body.invitationid || null;
  const unsyncedNotes = req.body.unsyncedNotes || [];

  // Validate
  if (!invitationid) {
    return res.status(400).send({
      msg: "invitationid is required",
      msgType: "error",
    });
  }
  if (typeof invitationid !== "number") {
    return res.status(400).send({
      msg: "invitationid must be numeric",
      msgType: "error",
    });
  }
  if (!Array.isArray(unsyncedNotes)) {
    return res.status(400).send({
      msg: "unsyncedNotes must be an array",
      msgType: "error",
    });
  }

  let unsyncedNotesLength = unsyncedNotes.length;

  // Query to verify that user is the author of the related invitation
  function verifyAuthorshipOfInvitation(invitationid) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          invitationid
        FROM
          invitations
        WHERE
          invitationid = ?
        AND
          userid = ?
        LIMIT
          1
        ;
      `;

      db.query(sql, [invitationid, req.user.userid], (error, result) => {
        if (error) {
          console.log(error);
          return reject(error);
        }

        if (!result.length) {
          return resolve(false);
        }

        return resolve(true);
      });
    });
  }

  // Query to store unsynced invites
  function saveUnsyncedNotes(unsyncedNotes) {
    const unsyncedNotePromises = unsyncedNotes.map((item) => {
      return new Promise(async (resolve, reject) => {
        const {
          date,
          eventid,
          invitationid,
          noteid,
          recipient,
          summary,
          text,
          timezone,
        } = item;

        const isUserAuthor = await verifyAuthorshipOfInvitation(invitationid);
        if (!isUserAuthor) reject(new Error("user must be the invite author"));

        const timeMomentObj = moment.utc(date);
        const createdAt = timeMomentObj.format("YYYY-MM-DD HH:mm:ss");
        const deleteNote = item.hasOwnProperty("delete") ? true : false;

        if (deleteNote) {
          const sql = `
            DELETE FROM
              notes
            WHERE
              noteid = ?
            AND
              userid = ?
            ;
          `;

          db.query(sql, [noteid, req.user.userid], (error, result) => {
            if (error) {
              console.log(error);
              return reject(error);
            }

            return resolve();
          });
        }

        const note = JSON.stringify({
          eventid: eventid,
          recipient: recipient,
          summary: summary,
          text: text,
          timezone: timezone,
        });

        const sql = `
          INSERT INTO notes(
            noteid,
            userid,
            invitationid,
            note,
            createdAt,
            updatedAt
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            UTC_TIMESTAMP()
          )
        `;

        db.query(
          sql,
          [noteid, req.user.userid, invitationid, note, createdAt],
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

    Promise.allSettled(unsyncedNotePromises, (values) => {
      return Promise.resolve(values);
    }).catch((err) => {
      console.log(err);
      return Promise.reject(err);
    });
  }

  function getNotesForInvite(invitationid) {
    return new Promise((resolve, reject) => {
      // Query for notes
      const sql = `
        SELECT
          n.createdAt AS date,
          i.eventid,
          n.invitationid,
          n.noteid,
          n.note
        FROM
          notes n
        INNER JOIN invitations i ON i.eventid = n.eventid
        WHERE
          n.invitationid = ?
        AND
          n.userid = ?
        ORDER BY
          n.createdAt ASC
        ;
      `;

      db.query(sql, [invitationid, req.user.userid], (error, result) => {
        if (error) {
          console.log(error);
          return reject(error);
        }

        const notes = result.map((item) => {
          const { date, eventid, invitationid, noteid, note } = item;
          const { recipient, summary, text, timezone } = note;
          const noteObj = {
            date: date,
            eventid: eventid,
            invitationid: invitationid,
            noteid: noteid,
            recipient: recipient,
            summary: summary,
            text: text,
            timezone: timezone,
          };
          return noteObj;
        });

        return resolve(notes);
      });
    });
  }

  if (unsyncedNotesLength) {
    saveUnsyncedNotes(unsyncedNotes).then(() => {
      getNotesForInvite(invitationid).then((notes) => {
        return res.status(200).send({
          msg: "notes for invite retrieved",
          msgType: "success",
          notes: notes,
        });
      });
    });
  } else {
    getNotesForInvite(invitationid).then((notes) => {
      return res.status(200).send({
        msg: "notes for invite retrieved",
        msgType: "success",
        notes: notes,
      });
    });
  }
};
