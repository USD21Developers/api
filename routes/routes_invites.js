const express = require("express");
const router = express.Router();
const utils = require("./controllers_invites/utils");
const authenticateToken = utils.authenticateToken;

// MANIFEST

const manifest = require("./controllers_invites/manifest");
router.get("/manifest.json", manifest.GET);

// REGISTRATION

const register = require("./controllers_invites/register");
router.post("/register", register.POST);

const registerConfirm = require("./controllers_invites/register-confirm");
router.post("/register-confirm", registerConfirm.POST);

const registerResendConfirmation = require("./controllers_invites/register-resend-confirmation");
router.post(
  "/register-resend-confirmation",
  authenticateToken,
  registerResendConfirmation.POST
);

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

const authorizationPreregGrant = require("./controllers_invites/authorization-prereg-grant");
router.post(
  "/authorization-prereg-grant",
  authenticateToken,
  authorizationPreregGrant.POST
);

const authorizationPreregClaim = require("./controllers_invites/authorization-prereg-claim");
router.post("/authorization-prereg-claim", authorizationPreregClaim.POST);

const authorizationPostregGrant = require("./controllers_invites/authorization-postreg-grant");
router.post(
  "/authorization-postreg-grant",
  authenticateToken,
  authorizationPostregGrant.POST
);

const authorizingUsers = require("./controllers_invites/authorizing-users");
router.post("/authorizing-users", authorizingUsers.POST);

const amIAuthorized = require("./controllers_invites/am-i-authorized");
router.post("/am-i-authorized", amIAuthorized.POST);

// IP

const ipMiddleware = function (req, res, next) {
  const clientIp = requestIp.getClientIp(req); // IP address of request lives in req, per "request-ip" middleware imported from node_modules in app.js
  next();
};

// SYNC

const syncChurches = require("./controllers_invites/sync-churches");
router.get("/sync-churches", syncChurches.GET);

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

// WEB PUSH SUBSCRIPTIONS
const pushSubscribe = require("./controllers_invites/push-subscribe");
router.post("/push-subscribe", authenticateToken, pushSubscribe.POST);

const pushUpdateSubscription = require("./controllers_invites/push-update-subscription");
router.post("/push-update-subscription", pushUpdateSubscription.POST);

const pushTest = require("./controllers_invites/push-test");
router.post("/push-test", authenticateToken, pushTest.POST);

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

const profile = require("./controllers_invites/profile");
router.post("/profile", authenticateToken, profile.POST);

const profilePhoto = require("./controllers_invites/profile-photo");
router.post("/profile-photo", authenticateToken, profilePhoto.POST);

const profileEmailConfirm = require("./controllers_invites/profile-email-confirm");
router.post(
  "/profile-email-confirm",
  authenticateToken,
  profileEmailConfirm.POST
);

const profileIsPrivilegedEmailConfirmed = require("./controllers_invites/profile-is-privileged-email-confirmed");
router.post(
  "/profile-is-privileged-email-confirmed",
  authenticateToken,
  profileIsPrivilegedEmailConfirmed.POST
);

const newChurch = require("./controllers_invites/new-church");
router.post("/new-church", authenticateToken, newChurch.POST);

const churchesWithUsers = require("./controllers_invites/churches-with-users");
router.get("/churches-with-users", churchesWithUsers.GET);

const usersByChurch = require("./controllers_invites/users-church");
router.post("/users-church", authenticateToken, usersByChurch.POST);

// INVITES

const invite = require("./controllers_invites/invite");
router.post("/invite", invite.POST);

const saveInvite = require("./controllers_invites/invite-send-beacon");
router.post("/invite-send-beacon", saveInvite.POST);

const altEventsInvite = require("./controllers_invites/alt-events-invite");
router.post("/alt-events-invite", altEventsInvite.POST);

const rsvp = require("./controllers_invites/rsvp");
router.post("/rsvp", rsvp.POST);

const deleteInvites = require("./controllers_invites/delete-invites");
router.post("/delete-invites", authenticateToken, deleteInvites.POST);

const undeleteInvite = require("./controllers_invites/undelete-invite");
router.post("/undelete-invite", authenticateToken, undeleteInvite.POST);

const editInvite = require("./controllers_invites/invite-edit");
router.post("/invite-edit", authenticateToken, editInvite.POST);

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

// LANGUAGES OF EVENTS

const languagesOfEvents = require("./controllers_invites/languages-of-events");
router.post("/languages-of-events", languagesOfEvents.POST);

// ALTERNATIVE EVENTS

const altEventSearch = require("./controllers_invites/alt-events-search");
router.post("/alt-events-search", altEventSearch.POST);

// MAPS

const mapStatic = require("./controllers_invites/map-static");
router.post("/map-static", mapStatic.POST);

const mapDefaultsForChurch = require("./controllers_invites/map-defaults-for-church");
router.post(
  "/map-defaults-for-church",
  authenticateToken,
  mapDefaultsForChurch.POST
);

const mapEvangelism = require("./controllers_invites/map-evangelism");
router.post("/map-evangelism", authenticateToken, mapEvangelism.POST);

const mapsApiKeys = require("./controllers_invites/maps-api-keys");
router.post("/maps-api-keys", authenticateToken, mapsApiKeys.POST);

// ADMIN

const adminUserSearch = require("./controllers_invites/admin-user-search");
router.post("/admin-user-search", authenticateToken, adminUserSearch.POST);

const adminUser = require("./controllers_invites/admin-user");
router.post("/admin-user", authenticateToken, adminUser.POST);

const adminUserUpdate = require("./controllers_invites/admin-user-update");
router.post("/admin-user-update", authenticateToken, adminUserUpdate.POST);

const photosPendingReview = require("./controllers_invites/photos-pending-review");
router.post(
  "/photos-pending-review",
  authenticateToken,
  photosPendingReview.POST
);

const photoReviews = require("./controllers_invites/photo-reviews");
router.post("/photo-reviews", authenticateToken, photoReviews.POST);

module.exports = router;
