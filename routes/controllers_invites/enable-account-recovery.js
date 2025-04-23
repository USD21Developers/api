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

  // Parameters
  const datakeyCt = req.body.datakeyCt || null;
  const keyPairCt = req.body.keyPairCt || null;

  // Validate

  if (!datakeyCt) {
    return res.status(400).send({
      msg: "datakeyCt is required",
      msgType: "error",
    });
  }

  if (!keyPairCt) {
    return res.status(400).send({
      msg: "keyPairCt is required",
      msgType: "error",
    });
  }

  // TODO:  store userPublicKey in "publickey" field of users table
  // TODO:  store userPrivateKeyCt in "privatekey" field of users table
  // TODO:  store datakeyCt in "datakey_recovered" field of users table

  /* return res.status(200).send({
    msg: "account recovery enabled",
    msgType: "success"
  }); */
};
