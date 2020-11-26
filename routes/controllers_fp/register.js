const db = require("../../database");

exports.POST = (req, res) => {
  return res.status(200).send(req.body);
};
