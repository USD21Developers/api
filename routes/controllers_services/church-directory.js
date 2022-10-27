exports.GET = (req, res) => {
  const db = require("../../database-services");

  const sqlChurchesByCountry = `
    SELECT 
      churchID,
      church_name,
      church_URL,
      identifying_place,
      mailing_city,
      mailing_state,
      mailing_country,
      country_iso
    FROM 
      churches
    ORDER BY
      mailing_country,
      identifying_place
    ;
  `;

  db.query(sqlChurchesByCountry, [], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({
        msg: "unable to query service for churches",
        msgType: "error",
      });
    }

    const churches = [];
    result.map((item) => {
      const {
        churchID,
        church_name,
        church_URL,
        identifying_place,
        mailing_city,
        mailing_country,
        country_iso,
      } = item;
      let countryName = mailing_country;
      if (country_iso === "us") countryName = "United States";
      let place = identifying_place;
      if (typeof place === "string" && !place.length) place = mailing_city;
      if (!churches.length) {
        churches.push({
          country: {
            iso: country_iso,
            name: countryName,
            churches: [
              {
                id: churchID,
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
            name: countryName,
            churches: [
              {
                id: churchID,
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
                id: churchID,
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

exports.FETCH = async () => {
  const db = require("../../database-services");

  const sqlChurches = `
    SELECT
      churchID,
      church_name,
      mailing_city,
      mailing_state,
      mailing_country,
      country_iso
    FROM
      churches
    ORDER BY
      country_iso,
      mailing_country,
      mailing_state,
      mailing_city,
      church_name,
      churchID
    ;
  `;

  return new Promise((resolve, reject) => {
    db.query(sqlChurches, [], (err, result) => {
      if (err) {
        console.log(err);
        return reject(new Error("unable to query service for churches"));
      }

      resolve(result);
    });
  });
};
