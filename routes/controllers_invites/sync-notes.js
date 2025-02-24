const moment = require("moment");

exports.POST = (req, res) => {
  // Set database
  const isStaging =
    req.headers?.referer?.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Params
  const unsyncedNotes = req.body.unsyncedNotes || [];

  // Validate
  if (!Array.isArray(unsyncedNotes)) {
    return res.status(400).send({
      msg: "unsyncedNotes must be an array",
      msgType: "error",
    });
  }

  function addOrUpdateNote(unsyncedNote) {
    return new Promise((resolve, reject) => {
      const {
        date,
        eventid,
        invitationid,
        lastModified,
        noteid,
        recipient,
        summary,
        text,
        timezone,
      } = unsyncedNote;
      const createdAt = moment.utc(date).format("YYYY-MM-DD HH:mm:ss");
      const updatedAt = moment.utc(lastModified).format("YYYY-MM-DD HH:mm:ss");
      const action = date === lastModified ? "add" : "update";
      const note = JSON.stringify({
        eventid: eventid,
        recipient: recipient,
        summary: summary,
        text: text,
        timezone: timezone,
      });

      unsyncedNote.action = action;

      if (action === "add") {
        const sql = `
          REPLACE INTO notes(
            noteid,
            userid,
            invitationid,
            note,
            createdAt,
            updatedAt
          ) VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          );
        `;

        db.query(
          sql,
          [noteid, req.user.userid, invitationid, note, createdAt, createdAt],
          (error, result) => {
            if (error) {
              console.log(error);
              return reject(error, unsyncedNote);
            }

            return resolve(unsyncedNote);
          }
        );
      } else if (action === "update") {
        const sql = `
          UPDATE notes
          SET
            note = ?,
            updatedAt = ?
          WHERE
            noteid = ?
          AND
            userid = ?
          ;
        `;

        db.query(
          sql,
          [note, updatedAt, noteid, req.user.userid],
          (error, result) => {
            if (error) {
              console.log(error);
              return reject(error, unsyncedNote);
            }

            return resolve(unsyncedNote);
          }
        );
      }
    });
  }

  function deleteNote(unsyncedNote) {
    return new Promise((resolve, reject) => {
      const okToDelete = unsyncedNote.delete ? true : false;
      if (!okToDelete) return reject(unsyncedNote);

      const { noteid } = unsyncedNote;

      const sql = `
        DELETE FROM notes
        WHERE noteid = ?
        AND userid = ?
        ;
      `;

      db.query(sql, [noteid, req.user.userid], (error, result) => {
        if (error) {
          console.log(error);
          return reject(error, unsyncedNote);
        }

        return resolve(unsyncedNote);
      });
    });
  }

  // Query to process unsynced invites
  function processUnsyncedNotes(unsyncedNotes) {
    const unsyncedNotePromises = unsyncedNotes.map((item) => {
      if (item.delete) {
        return deleteNote(item);
      } else {
        return addOrUpdateNote(item);
      }
    });

    return Promise.allSettled(unsyncedNotePromises);
  }

  function getNotes() {
    return new Promise((resolve, reject) => {
      // Query for notes
      const sql = `
        SELECT
          n.createdAt AS date,
          n.updatedAt AS lastModified,
          i.eventid,
          n.invitationid,
          n.noteid,
          n.note
        FROM
          notes n
        INNER JOIN invitations i ON i.invitationid = n.invitationid
        WHERE
          n.userid = ?
        AND
          n.isLockedByChangedPassword = 0
        ORDER BY
          n.createdAt ASC
        ;
      `;

      db.query(sql, [req.user.userid], (error, result) => {
        if (error) {
          console.log(error);
          return reject(error);
        }

        const notes = result.map((item) => {
          const { date, lastModified, eventid, invitationid, noteid, note } =
            item;
          const { recipient, summary, text, timezone } = JSON.parse(note);
          const noteObj = {
            date: date,
            lastModified: lastModified,
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

  if (unsyncedNotes.length) {
    processUnsyncedNotes(unsyncedNotes).then((results) => {
      getNotes().then((notes) => {
        return res.status(200).send({
          msg: "notes synced",
          msgType: "success",
          notes: notes,
        });
      });
    });
  } else {
    getNotes().then((notes) => {
      return res.status(200).send({
        msg: "notes synced",
        msgType: "success",
        notes: notes,
      });
    });
  }
};
