"use strict";

require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();
const routes_fp = require("./routes/routes_fp");
const routes_invites = require("./routes/routes_invites");
const routes_services = require("./routes/routes_services");

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// routes
app.use("/fp", routes_fp);
app.use("/invites", routes_invites);
app.use("/services", routes_services);

// listen
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Node Express started on port ${port}`));
