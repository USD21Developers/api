const moment = require("moment");

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
      unsyncedNote.action = "delete";

      if (!unsyncedNote.delete) return reject(unsyncedNote);

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

  // Query to store unsynced invites
  function saveUnsyncedNotes(unsyncedNotes) {
    const unsyncedNotePromises = unsyncedNotes.map((item) => {
      if (item.delete) {
        return deleteNote(item);
      } else {
        return addOrUpdateNote(item);
      }
    });

    return Promise.allSettled(unsyncedNotePromises);
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
        INNER JOIN invitations i ON i.invitationid = n.invitationid
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
          const { recipient, summary, text, timezone } = JSON.parse(note);
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

  if (unsyncedNotes.length) {
    saveUnsyncedNotes(unsyncedNotes).then((results) => {
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
