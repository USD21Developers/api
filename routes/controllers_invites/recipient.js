exports.POST = async (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["sysadmin", "user"];
  let isAuthorized = false;
  if (allowedUsertypes.includes(usertype)) isAuthorized = true;
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

  const recipientid = req.body.recipientid || "";

  if (recipientid === "") {
    return res.status(400).send({
      msg: "invalid recipient id",
      msgType: "error",
    });
  }

  res.status(200).send({
    msg: "recipient retrieved",
    msgType: "success",
    recipient: recipientid,
  });
};
