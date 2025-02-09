exports.syncChurches = (schedule, cronOptions) => {
  const cron = require("node-cron");

  cron.schedule(
    schedule,
    () => {
      // console.log("syncChurches cron job beginning...");

      // Set databases
      const dbInvites = require("../../../database-invites");
      const dbServices = require("../../../database-services");

      const getChurchesRemote = (dbServices) => {
        return new Promise((resolve, reject) => {
          const sql = `
              SELECT 
                churchID,
                CONVERT(CAST(church_name AS BINARY) USING utf8) AS church_name,
                church_URL,
                CONVERT(CAST(contact_name as BINARY) USING utf8) AS contact_name,
                CONVERT(CAST(contact_number as BINARY) USING utf8) AS contact_number,
                CONVERT(CAST(identifying_place as BINARY) USING utf8) AS identifying_place,
                LCASE(country_iso) AS country_iso
              FROM 
                churches
              ORDER BY
                churchID
              ;
            `;

          dbServices.query(sql, [], (error, result) => {
            if (error) {
              return reject(error);
            }

            return resolve(result);
          });
        });
      };

      const getChurchesLocal = (dbInvites) => {
        return new Promise((resolve, reject) => {
          const sql = `
              SELECT
                remoteid
              FROM
                churches
              WHERE
                isDeleted = 0
              ORDER BY
                remoteid
              ;
            `;

          dbInvites.query(sql, [], (error, result) => {
            if (error) {
              return reject(error);
            }

            return resolve(result);
          });
        });
      };

      const updateChurchesLocal = (dbInvites, churchesRemote) => {
        return new Promise((resolve, reject) => {
          if (!churchesRemote.length) return reject();

          // Prepare the array of values and the SQL statement
          const values = [];
          let sql = `
            INSERT INTO churches(remoteid, name, place, country, url, createdAt)
            VALUES
          `;

          // Build the values array and the corresponding SQL placeholders
          churchesRemote.forEach((church) => {
            if (
              typeof church.churchID !== "number" ||
              !church.church_name ||
              !church.identifying_place ||
              !church.country_iso
            ) {
              return; // Skip invalid entries
            }

            const sqlUrl =
              typeof church.church_URL === "string"
                ? church.church_URL.trim().toLowerCase()
                : "";
            const valueSet = [
              church.churchID,
              church.church_name,
              church.identifying_place,
              church.country_iso,
              sqlUrl,
            ];

            // Push the values for this church
            values.push(...valueSet);
            sql += "(?, ?, ?, ?, ?, UTC_TIMESTAMP()), ";
          });

          // Remove the last comma and space
          sql = sql.slice(0, -2);

          // Add the ON DUPLICATE KEY UPDATE part
          sql += `
            ON DUPLICATE KEY UPDATE
              name = VALUES(name),
              place = VALUES(place),
              country = VALUES(country),
              url = COALESCE(VALUES(url), url);
          `;

          // Execute the query with the batch of values
          dbInvites.query(sql, values, (error, result) => {
            if (error) {
              console.log(error);
              return reject(error);
            }
            resolve(result);
          });
        });
      };

      const deleteChurchesLocal = (dbInvites, deletedIds) => {
        return new Promise((resolve, reject) => {
          const sqlDeletedIds = deletedIds.length ? deletedIds.join() : "";
          const sql = `
              UPDATE
                churches
              SET
                isDeleted = 1
              WHERE
                remoteid IN (?)
              ;
            `;

          dbInvites.query(sql, [sqlDeletedIds], (error, result) => {
            if (error) {
              return reject(error);
            }

            return resolve();
          });
        });
      };

      Promise.all([
        getChurchesRemote(dbServices),
        getChurchesLocal(dbInvites),
      ]).then(async ([churchesRemote, churchesLocal]) => {
        // Store church IDs for remote
        const remoteIds = churchesRemote.length
          ? churchesRemote.map((item) => item.churchid)
          : [];

        // Store church IDs for local
        const localIds = churchesLocal.length
          ? churchesLocal.map((item) => item.id)
          : [];

        // Update non-deleted local churches with data from remote
        if (churchesRemote && churchesRemote.length) {
          await updateChurchesLocal(dbInvites, churchesRemote);
        }

        // Store church IDs from local that have been deleted from remote
        const deletedIds = localIds.filter((id) => !remoteIds.includes(id));

        // Designate local churches as deleted (if missing from remote)
        deleteChurchesLocal(dbInvites, deletedIds);

        // console.log("syncChurches cron job ending...");
      });
    },
    cronOptions
  );
};
