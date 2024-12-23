"use strict";

require("dotenv").config();

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();
const routes_fp = require("./routes/routes_fp");
const routes_invites = require("./routes/routes_invites");
const routes_glc = require("./routes/routes_glc");
const routes_services = require("./routes/routes_services");
const requestIp = require("request-ip");

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.options("*", cors());
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(
  express.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 })
);
app.use(express.text());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(requestIp.mw());

// routes
app.use("/fp", routes_fp);
app.use("/invites", routes_invites);
app.use("/glc", routes_glc);
app.use("/services", routes_services);

// cron job variables
const every60Seconds = "* * * * *";
const every24Hours = "0 0 * * *";
const everySunday = "* * * * 0";
const everyMonday = "* * * * 1";
const everyTuesday = "* * * * 2";
const everyWednesday = "* * * * 3";
const everyThursday = "* * * * 4";
const everyFriday = "* * * * 5";
const everySaturday = "* * * * 6";

const cronOptions = {
  scheduled: true,
  timezone: "America/Phoenix",
};

/* require(`./cron/invites/${process.env.ENV}/unconfirmed-accounts`).unconfirmedAccounts(
  everyMonday,
  cronOptions
); */

require(`./cron/invites/staging/sync-churches`).syncChurches(
  every24Hours,
  cronOptions
);

require(`./cron/invites/${process.env.ENV}/sync-churches`).syncChurches(
  every24Hours,
  cronOptions
);

// listen
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Node Express started on port ${port}`));
