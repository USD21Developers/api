exports.GET = (req, res) => {
  const db = require("../../database-services");
  const sql = `
    SELECT 
      church_name,
      church_URL,
      mailing_city,
      mailing_state,
      mailing_country
    FROM 
      churches
    ORDER BY
      mailing_country,
      mailing_city
    ;
  `;

  db.query(sql, [], (err, result) => {
    if (err) {
      return res.status(500).send({ msg: "unable to query service for churches", msgType: "error", err: err });
    }

    const data = result.map(item => {
      const { church_name, church_URL, mailing_city, mailing_state, mailing_country } = item;
      return {
        name: church_name,
        url: church_URL,
        city: mailing_city,
        state: mailing_state,
        country: mailing_country
      }
    });

    return res.status(200).send(data);
  });
}
