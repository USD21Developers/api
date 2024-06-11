exports.POST = (req, res) => {
  // Set database
  const isLocal = req.headers.referer.indexOf("localhost") >= 0 ? true : false;
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = require("../../database-services");

  return res.status(200).send();
};
