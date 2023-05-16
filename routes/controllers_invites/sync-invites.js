exports.POST = (req, res) => {
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

  // Params
  const unsyncedInvites = req.body.unsyncedInvites || [];

  // Validate

  // Query to store unsynced invites

  // Query to retrieve all of user's invites
  const invites = unsyncedInvites; // Change this

  // Return
  return res.status(200).send({
    msg: "Cuppa coffee in the big time, yea!!",
    msgType: "success",
    invites: invites,
  });
};
