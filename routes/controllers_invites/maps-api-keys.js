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

  const mapsApiKeys = {
    prod: process.env.GOOGLE_MAPS_API_KEY_PROD,
    staging: process.env.GOOGLE_MAPS_API_KEY_STAGING,
    dev: process.env.GOOGLE_MAPS_API_KEY_DEV,
  };

  return res.status(200).send({
    msg: "maps api keys retrieved",
    msgType: "success",
    mapsApiKeys: mapsApiKeys,
  });
};
