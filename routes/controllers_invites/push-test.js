const sendWebPush = require("./utils").sendWebPush;

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
  const isLocal =
    req.headers.referer.includes("localhost") ||
    req.headers.referer.includes("127.0.0.1")
      ? true
      : false;
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Params
  const payload = req.body.payload || null;
  const pushSubscription = req.body.pushSubscription || null;

  // Validate

  if (!payload) {
    return res.status(400).send({
      msg: "push payload is required",
      msgType: "error",
    });
  }

  if (!pushSubscription) {
    return res.status(400).send({
      msg: "push subscription is required",
      msgType: "error",
    });
  }

  if (typeof payload !== "object") {
    return res.status(400).send({
      msg: "push payload must be an object",
      msgType: "error",
    });
  }

  if (!payload.hasOwnProperty("title")) {
    return res.status(400).send({
      msg: "push payload must contain title",
      msgType: "error",
    });
  }

  if (!payload.hasOwnProperty("body")) {
    return res.status(400).send({
      msg: "push payload must contain body",
      msgType: "error",
    });
  }

  if (typeof pushSubscription !== "object") {
    return res.status(400).send({
      msg: "push subscription must be an object",
      msgType: "error",
    });
  }

  sendWebPush(db, req.user.userid, payload.title, payload.body, {
    clickURL: "/settings/#pushclicked",
  })
    .then((results) => {
      return res.status(200).send({
        msg: "test push messages sent",
        msgType: "success",
        result: results,
      });
    })
    .catch((error) => {
      return res.status(500).send({
        msg: "could not send test push messages",
        msgType: "error",
        error: error,
      });
    });
};
