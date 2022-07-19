// const moment = require("moment");
const moment = require("moment-timezone");

exports.GET = async (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["sysadmin", "user"];
  let isAuthorized = false;
  if (allowedUsertypes.includes(usertype)) isAuthorized = true;
  if (req.user.may_create_coupons) isAuthorized = true;
  if (!isAuthorized) {
    console.log(`User (userid ${req.user.userid}) is not authorized.`);
    return res.status(401).send({
      msg: "user is not authorized for this action",
      msgType: "error",
    });
  }

  // Set database
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Query for events
  const getEventsByUser = require("../controllers_invites/utils").getEventsByUser;
  const events = await getEventsByUser(db, req.user.userid).catch((error) => {
    console.log(error);
    return res.status(500).send({ msg: "unable to return events", msgType: "error" });
  });

  if (!events.length) {
    return res.status(200).send({ msg: "no events found", msgType: "success", events: [] });
  }

  return res.status(200).send({ msg: "events retrieved", msgType: "success", events: events });
};
