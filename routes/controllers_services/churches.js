exports.GET = (req, res) => {
  const db = require("../../database-services");
  const sql = `
    SELECT 
      church_name,
      church_URL,
      mailing_city,
      mailing_state,
      mailing_country,
      country_iso
    FROM 
      churches
    ORDER BY
    country_iso,
      mailing_state,
      mailing_city
    ;
  `;

  db.query(sql, [], (err, result) => {
    if (err) {
      return res.status(500).send({
        msg: "unable to query service for churches",
        msgType: "error",
      });
    }

    const churches = [];
    result.map((item) => {
      const {
        church_name,
        church_URL,
        mailing_city,
        mailing_state,
        mailing_country,
        country_iso,
      } = item;
      let place = mailing_city.trim();
      if (
        mailing_state.trim() !== "" &&
        mailing_state.trim() !== mailing_city
      ) {
        place = `${mailing_city}, ${mailing_state}`.trim();
      }
      if (!churches.length) {
        churches.push({
          country: {
            iso: country_iso,
            name: mailing_country,
            churches: [
              {
                name: church_name,
                place: place,
                url: church_URL,
              },
            ],
          },
        });
        return;
      }
      const churchesLen = churches.length;
      let hasCountry = false;
      for (let i = 0; i < churchesLen; i++) {
        const church = churches[i];
        if (church.country.iso === country_iso) {
          hasCountry = true;
          break;
        }
      }
      if (!hasCountry) {
        churches.push({
          country: {
            iso: country_iso,
            name: mailing_country,
            churches: [
              {
                name: church_name,
                place: place,
                url: church_URL,
              },
            ],
          },
        });
      } else {
        for (let i = 0; i < churchesLen; i++) {
          if (churches[i].country.iso === country_iso) {
            const churchesInCountryLen = churches[i].country.churches.length;
            let containsChurch = false;
            for (let j = 0; j < churchesInCountryLen; j++) {
              if (!churches[i].country.churches[j].name === church_name) {
                containsChurch = true;
              }
            }
            if (!containsChurch) {
              churches[i].country.churches.push({
                name: church_name,
                place: place,
                url: church_URL,
              });
              continue;
            }
          }
        }
      }
    });

    return res.status(200).send(churches);
  });
};
