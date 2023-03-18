exports.unconfirmedAccounts = (schedule, cronOptions) => {
  const cron = require("node-cron");

  cron.schedule(
    schedule,
    () => {
      const db = require("./database-invites-test");

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
};
