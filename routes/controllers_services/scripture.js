exports.POST = (req, res) => {
  const book = req.body.book || "";
  const chapter = req.body.chapter || "";
  const verseFrom = req.body.verseFrom || "";
  const verseTo = req.body.verseTo || "";

  // Set database

  const db = require("../../database-bible");

  // Validate

  if (typeof book !== "string") {
    return res.status(400).send({
      msg: "book must be a string",
      msgType: "error",
      params: req.params,
    });
  }

  if (book.trim().length === 0) {
    return res.status(400).send({
      msg: "book must be a string with length",
      msgType: "error",
      params: req.params,
    });
  }

  if (isNaN(chapter)) {
    return res.status(400).send({
      msg: "chapter must be a number",
      msgType: "error",
      params: req.params,
    });
  }

  if (isNaN(verseFrom)) {
    return res.status(400).send({
      msg: "verseFrom must be a number",
      msgType: "error",
      params: req.params,
    });
  }

  if (isNaN(verseTo)) {
    return res.status(400).send({
      msg: "verseTo must be a number",
      msgType: "error",
      params: req.params,
    });
  }

  // Query

  const sql = `
    SELECT
      *
    FROM
      niv
    WHERE
      book = ?
    AND
      chapter = ?
    AND
      verse BETWEEN ? AND ?
    ;
  `;

  db.query(sql, [book, chapter, verseFrom, verseTo], (error, result) => {
    if (error) {
      console.log(error);
      return res.status(500).send({
        msg: "unable to query for scripture",
        msgType: "error",
      });
    }

    return res.status(200).send({
      msg: "scripture retrieved",
      msgType: "success",
      scripture: result,
    });
  });
};
