exports.POST = (req, res) => {
  // Set database
  const isStaging =
    req.headers?.referer?.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Parameters
  const eventid = Number(req.body.eventid) || null;
  const userid = Number(req.body.userid) || null;
  const recipientid = req.body.recipientid || null;
  const countryFromIP = req.body.countryFromIP;
  const distanceUnit = req.body.distanceUnit;
  const lang = req.body.lang;
  const originLocation = req.body.originLocation;
  const radius = req.body.radius;

  // MAIN LOGIC

  const events = []; // Populate this from the DB

  return res.status(200).send({
    msg: "alternative events retrieved",
    msgType: "success",
    events: events,
  });
};
