"use strict";

require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const cron = require("node-cron");
const app = express();
const routes_fp = require("./routes/routes_fp");
const routes_invites = require("./routes/routes_invites");
const routes_glc = require("./routes/routes_glc");
const routes_services = require("./routes/routes_services");
const requestIp = require("request-ip");

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(
  express.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 })
);
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

// INVITES: cron job to remove unconfirmed user accounts
cron.schedule(
  every2Minutes,
  () => {
    const isStaging =
      req.headers.referer.indexOf("staging") >= 0 ? true : false;
    const db = isStaging
      ? require("./database-invites-test")
      : require("./database-invites");

    const sql = `
      SELECT userid
      FROM users u
      INNER JOIN tokens t ON t.userid = u.userid
      WHERE t.expiry < UTC_TIMESTAMP()
      ;
    `;

    db.query(sql, [], (err, result) => {
      if (err) {
        return console.log(err);
      }

      const userids = result.length ? result.join() : "";

      const sql = `
        DELETE FROM photoreview
        WHERE userid IN (?)
        ;
      `;

      db.query(sql, [userids], (err, result) => {
        if (err) {
          return console.log(err);
        }

        const sql = `
          DELETE FROM tokens
          WHERE userid IN (?)
          ;
        `;

        db.query(sql, [userids], (err, result) => {
          if (err) {
            return console.log(err);
          }

          const sql = `
            DELETE FROM users
            WHERE userid IN (?)
            ;
          `;

          db.query(sql, [userids], async (err, result) => {
            if (err) {
              return console.log(err);
            }

            const userids = userids.split(",").map((item) => Number(item));

            if (!Array.isArray(userids)) return;
            if (!userids.length) return;

            const deletedUsers = [];

            userids.forEach((userid) => {
              const deleteProfileImage =
                require("./routes/controllers_invites/utils").deleteProfileImage;

              deletedUsers.push(deleteProfileImage(userid, db));
            });

            Promise.all(deletedUsers).then(() => {
              console.log("deleted unconfirmed users");
            });
          });
        });
      });
    });
  },
  cronOptions
);

// listen
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Node Express started on port ${port}`));
