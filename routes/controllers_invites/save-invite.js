exports.POST = (req, res) => {
  // Set database
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  const { accessToken, invite } = JSON.parse(req.body);

  return res.status(200).send({
    msg: "event saved",
    msgType: "success",
  });
};
