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
  "https://invites.usd21.org",
  "https://staging.invites.usd21.org",
  "https://localhost",
  "https://127.0.0.1",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET,POST",
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.options("*", cors(corsOptions));

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
const everyMonday = "* * * * * */Monday";
const every2Minutes = "* */1 * * * *";
const cronOptions = {
  scheduled: true,
  timezone: "America/Phoenix",
};

require(`./cron/invites/${process.env.ENV}/unconfirmed-accounts`).unconfirmedAccounts(
  everyMonday,
  cronOptions
);

// listen
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Node Express started on port ${port}`));
