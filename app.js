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
  "https://invites.mobi",
  "https://staging.invites.mobi",
  "http://localhost:5555",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false); // Instead of throwing an error, just block it
    }
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests properly
app.options("*", (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Allow-Credentials", "true");
    return res.sendStatus(204);
  }
  res.sendStatus(403); // Forbidden for disallowed origins
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
