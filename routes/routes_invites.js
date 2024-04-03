const express = require("express");
const router = express.Router();
const utils = require("./controllers_invites/utils");
const authenticateToken = utils.authenticateToken;

// REGISTRATION

const register = require("./controllers_invites/register");
router.post("/register", register.POST);

const registerConfirm = require("./controllers_invites/register-confirm");
router.post("/register-confirm", registerConfirm.POST);

// SECURITY

const refreshToken = require("./controllers_invites/refresh-token");
router.post("/refresh-token", refreshToken.POST);

const login = require("./controllers_invites/login");
router.post("/login", login.POST);

const forgotPassword = require("./controllers_invites/forgot-password");
router.post("/forgot-password", forgotPassword.POST);

const resetPassword = require("./controllers_invites/reset-password");
router.post("/reset-password", resetPassword.POST);

/* const passwordMustChange = require("./controllers_invites/password-must-change");
router.post(
  "/password-must-change",
  authenticateToken,
  passwordMustChange.POST
); */

// EVENTS

const eventAdd = require("./controllers_invites/event-add");
router.post("/event-add", authenticateToken, eventAdd.POST);

const eventGet = require("./controllers_invites/event-get");
router.post("/event-get", authenticateToken, eventGet.POST);

const eventEdit = require("./controllers_invites/event-edit");
router.post("/event-edit", authenticateToken, eventEdit.POST);

const eventDelete = require("./controllers_invites/event-delete");
router.post("/event-delete", authenticateToken, eventDelete.POST);

const eventList = require("./controllers_invites/event-list");
router.get("/event-list/:userid", authenticateToken, eventList.GET);

// AUTHORIZATION

const authorize = require("./controllers_invites/authorize");
router.post("/authorize", authorize.POST);
const ipMiddleware = function (req, res, next) {
  const clientIp = requestIp.getClientIp(req);
  next();
};

// SYNC

const syncEvents = require("./controllers_invites/sync-events");
router.get("/sync-events", authenticateToken, syncEvents.GET);

const syncInvites = require("./controllers_invites/sync-invites");
router.post("/sync-invites", authenticateToken, syncInvites.POST);

const syncUpdatedInvites = require("./controllers_invites/sync-updated-invites");
router.post(
  "/sync-updated-invites",
  authenticateToken,
  syncUpdatedInvites.POST
);

const syncNotifications = require("./controllers_invites/sync-notifications");
router.post("/sync-notifications", authenticateToken, syncNotifications.POST);

const syncSettings = require("./controllers_invites/sync-settings");
router.post("/sync-settings", authenticateToken, syncSettings.POST);

// USERS

const usersAll = require("./controllers_invites/users-all");
router.post("/users-all", authenticateToken, usersAll.POST);

const followUser = require("./controllers_invites/follow-user");
router.post("/follow-user", authenticateToken, followUser.POST);

const unfollowUser = require("./controllers_invites/unfollow-user");
router.post("/unfollow-user", authenticateToken, unfollowUser.POST);

const followSearch = require("./controllers_invites/follow-search");
router.post("/follow-search", authenticateToken, followSearch.POST);

const followingQuantity = require("./controllers_invites/following-quantity");
router.get(
  "/following-quantity/:userid",
  authenticateToken,
  followingQuantity.GET
);

const following = require("./controllers_invites/following");
router.get("/following/:userid", authenticateToken, following.GET);

const followers = require("./controllers_invites/followers");
router.get("/followers/:userid", authenticateToken, followers.GET);

const followStatus = require("./controllers_invites/follow-status");
router.post("/follow-status", authenticateToken, followStatus.POST);

const user = require("./controllers_invites/user");
router.post("/user", authenticateToken, user.POST);

const userProfile = require("./controllers_invites/user-profile");
router.get("/userprofile/:userid", authenticateToken, userProfile.GET);

const profilePhoto = require("./controllers_invites/profile-photo");
router.post("/profile-photo", authenticateToken, profilePhoto.POST);

// INVITES

const invite = require("./controllers_invites/invite");
router.post("/invite", invite.POST);

const saveInvite = require("./controllers_invites/invite-send-beacon");
router.post("/invite-send-beacon", saveInvite.POST);

const altEventsInvite = require("./controllers_invites/alt-events-invite");
router.post("/alt-events-invite", altEventsInvite.POST);

// RECIPIENTS

const recipient = require("./controllers_invites/recipient");
router.post("/recipient", authenticateToken, recipient.POST);

// NOTES

const notesForInvite = require("./controllers_invites/notes-for-invite");
router.post("/notes-for-invite", authenticateToken, notesForInvite.POST);

const syncNotes = require("./controllers_invites/sync-notes");
router.post("/sync-notes", authenticateToken, syncNotes.POST);

// UNSUBSCRIBING

const unsubscribeBefore = require("./controllers_invites/unsubscribe-before");
router.post("/unsubscribe-before", unsubscribeBefore.POST);

const unsubscribe = require("./controllers_invites/unsubscribe");
router.post("/unsubscribe", unsubscribe.POST);

// MAPS

const mapStatic = require("./controllers_invites/map-static");
router.post("/map-static", mapStatic.POST);

module.exports = router;

// LANGUAGES OF EVENTS

const languagesOfEvents = require("./controllers_invites/languages-of-events");
router.post("/languages-of-events", languagesOfEvents.POST);

// ALTERNATIVE EVENTS

const altEventSearch = require("./controllers_invites/alt-events-search");
router.post("/alt-events-search", altEventSearch.POST);
