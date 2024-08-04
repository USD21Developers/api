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
  const isLocal = req.headers.referer.indexOf("localhost") >= 0 ? true : false;
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Params

  // This param is derived from the QR code, which is scanned by the authorizing user
  const userid = req.body.userid || null;

  // These params are derived from the form that is completed by the authorizing user
  const churchid = req.body.churchid || null;
  const highestLeadershipRole = req.body.highestLeadershipRole || null;
  const acceptedOath = req.body.acceptedOath || null;
  const welcomeEmailPhrases = req.body.welcomeEmailPhrases || null;
  const welcomeEmailTemplate = req.body.welcomeEmailTemplate || null;
  const userToken = req.body.userToken || null;

  // TODO:  validate form

  // TODO:  verify authenticity of "userToken" JWT

  // TODO:  validate:  new user's account must actually exist

  // TODO:  validate:  new user's account must not be in a "pending confirmation" or "frozen" state; must be "registered"

  // TODO:  validate:  authorizing user must have "canAuthToAuth" permission if churchid from form is different that churchid in user's account (this could happen if, by the time they are granting the authorization, the new user has already changed churches)

  // TODO:  set new user's "canAuthorize" field to 1 (if "highestLeadershipRole" is any higher than "none")

  // TODO:  set new user's "canAuthToAuth" field to 1 (if "highestLeadershipRole" is "house church leader or higher")

  // TODO:  set new user's "isAuthorized" field to 1

  // TODO:  add "authorizedby" field to "users" table.

  // TODO:  in "authorization-postreg-grant" script (this script), set "authorizedby" field in "users" table to the userid of the authorizing user.

  // TODO:  in "authorization-prereg-claim" script, set "authorizedby" field in "users" table to the userid of the authorizing user.

  // TODO:  in the API response, send back both (A) refreshToken and (B) accessToken, so new user doesn't have to log in all over again. User had to log in, in order to access the "/authorize/me/" route on the front end.

  let refreshToken;
  let accessToken;

  return req.status(200).send({
    msg: "user is now authorized",
    msgType: "success",
    refreshToken: refreshToken,
    accessToken: accessToken,
  });
};
