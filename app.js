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

const allowedOrigins = [
  "http://localhost:5555",
  "https://invites.mobi",
  "https://staging.invites.mobi",
  "https://firstprinciples.mobi",
  "https://staging.firstprinciples.mobi",
  "https://usd21.org",
  "https://phxicc.org",
  "https://cityofangelsicc.org",
  "https://www.orlandoicc.org",
  "https://invites.world",
  "https://api.invites.world",
];

const corsOptions = {
  origin: "*", // Allow requests from all domains
  credentials: true, // Allow sending cookies or Authorization headers
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allow all common HTTP methods
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ], // Allow all necessary headers
};

app.use(cors(corsOptions));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(cors(corsOptions));

app.options("*", (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Credentials", "true");
  res.set("Access-Control-Max-Age", "86400"); // Cache preflight requests for 24 hours
  res.sendStatus(204);
});

app.use(express.json({ limit: "50mb" }));
app.use(
  express.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 })
);
app.use(express.text());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(requestIp.mw());

// Routes
app.use("/fp", routes_fp);
app.use("/invites", routes_invites);
app.use("/glc", routes_glc);
app.use("/services", routes_services);

// Cron job variables
const every60Seconds = "* * * * *";
const every24Hours = "0 0 * * *";

const cronOptions = {
  scheduled: true,
  timezone: "America/Phoenix",
};

require(`./cron/invites/staging/sync-churches`).syncChurches(
  every24Hours,
  cronOptions
);

require(`./cron/invites/${process.env.ENV}/sync-churches`).syncChurches(
  every24Hours,
  cronOptions
);

// Listen
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Node Express started on port ${port}`));
