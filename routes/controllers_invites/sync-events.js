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
  const filterOutExpiredEvents = require("./utils").filterOutExpiredEvents;
  const getEventsByUser = require("./utils").getEventsByUser;
  const events = await getEventsByUser(
    db,
    req.user.userid,
    req.user.userid
  ).catch((error) => {
    console.log(error);
    return res
      .status(500)
      .send({ msg: "unable to return events", msgType: "error" });
  });

  let unexpiredEvents;

  unexpiredEvents = filterOutExpiredEvents(events);

  // Query for events by followed users
  const getEventsByFollowedUsers =
    require("../controllers_invites/utils").getEventsByFollowedUsers;
  const eventsByFollowedUsers = await getEventsByFollowedUsers(
    db,
    req.user.userid
  ).catch((error) => {
    console.log(error);
    return res.status(500).send({
      msg: "unable to return events by followed users",
      msgType: "error",
    });
  });

  let unexpiredEventsByFollowedUsers;

  unexpiredEventsByFollowedUsers = filterOutExpiredEvents(
    eventsByFollowedUsers
  );

  // Query for followed users
  const getFollowedUsers =
    require("../controllers_invites/utils").getFollowedUsers;
  const followedUsers = await getFollowedUsers(db, req.user.userid).catch(
    (error) => {
      console.log(error);
      return res.status(500).send({
        msg: "unable to return followed users",
        msgType: "error",
      });
    }
  );

  // Return out if there are no events
  if (!unexpiredEvents.length && !unexpiredEventsByFollowedUsers.length) {
    return res.status(200).send({
      msg: "no events found",
      msgType: "success",
      events: [],
      eventsByFollowedUsers: [],
      followedUsers: followedUsers,
    });
  }

  // Return events found
  return res.status(200).send({
    msg: "events retrieved",
    msgType: "success",
    events: unexpiredEvents,
    eventsByFollowedUsers: unexpiredEventsByFollowedUsers,
    followedUsers: followedUsers,
  });
};
