const express = require("express");
const router = express.Router();
const utils = require("./controllers_fp/utils");
const authenticateToken = utils.authenticateToken;

// REGISTRATION

const register = require("./controllers_fp/register");
router.post("/register", register.POST);

const registerConfirm = require("./controllers_fp/register-confirm");
router.post("/register-confirm", registerConfirm.POST);

// SECURITY

const refreshToken = require("./controllers_fp/refresh-token");
router.post("/refresh-token", refreshToken.POST);

const login = require("./controllers_fp/login");
router.post("/login", login.POST);

const forgotPassword = require("./controllers_fp/forgot-password");
router.post("/forgot-password", forgotPassword.POST);

const resetPassword = require("./controllers_fp/reset-password");
router.post("/reset-password", resetPassword.POST);

const passwordMustChange = require("./controllers_fp/password-must-change");
router.post(
  "/password-must-change",
  authenticateToken,
  passwordMustChange.POST
);

// PAYPAL SANDBOX

const paypalReturnUrlSandbox = require("./controllers_fp/paypalReturnUrlSandbox");
router.post("/paypal-return-sandbox", paypalReturnUrlSandbox.POST);

const paypalWebhooksUrlSandbox = require("./controllers_fp/paypalWebhooksUrlSandbox");
router.post("/paypal-webhooks-sandbox", paypalWebhooksUrlSandbox.POST);

// PAYPAL LIVE

const paypalReturnUrlLive = require("./controllers_fp/paypalReturnUrlLive");
router.post("/paypal-return", paypalReturnUrlLive.POST);

const paypalWebhooksUrlLive = require("./controllers_fp/paypalWebhooksUrlLive");
router.post("/paypal-webhooks", paypalWebhooksUrlLive.POST);

// SUBSCRIPTION

const checkSubscription = require("./controllers_fp/check-subscription");
router.post("/check-subscription", authenticateToken, checkSubscription.POST);

const beginSubscription = require("./controllers_fp/begin-subscription");
router.post("/begin-subscription", authenticateToken, beginSubscription.POST);

const activateSubscription = require("./controllers_fp/activate-subscription");
router.post(
  "/activate-subscription",
  authenticateToken,
  activateSubscription.POST
);

// PROFILE

const profileView = require("./controllers_fp/profile_view");
router.post("/profile", authenticateToken, profileView.POST);

const profileEdit = require("./controllers_fp/profile_edit");
router.post("/profile-edit", authenticateToken, profileEdit.POST);

module.exports = router;

// COUPONS

const couponMetaData = require("./controllers_fp/coupon-metadata");
router.get("/coupon-metadata", authenticateToken, couponMetaData.GET);

const couponList = require("./controllers_fp/coupon_list");
router.post("/coupon-list", authenticateToken, couponList.POST);

const couponSearch = require("./controllers_fp/coupon_search");
router.post("/coupon-search", authenticateToken, couponSearch.POST);

const couponAdd = require("./controllers_fp/coupon_add");
router.post("/coupon-add", authenticateToken, couponAdd.POST);

const couponEdit = require("./controllers_fp/coupon_edit");
router.post("/coupon-edit", authenticateToken, couponEdit.POST);

const couponDelete = require("./controllers_fp/coupon_delete");
router.post("/coupon-delete", authenticateToken, couponDelete.POST);

// ADMIN
const adminMetadata = require("./controllers_fp/admin_metadata");
router.post("/admin-metadata", authenticateToken, adminMetadata.POST);

const usersListAll = require("./controllers_fp/users_list_all");
router.post("/users-list-all", authenticateToken, usersListAll.POST);

const usersListSubscribers = require("./controllers_fp/users_list_subscribers");
router.post(
  "/users-list-subscribers",
  authenticateToken,
  usersListSubscribers.POST
);
