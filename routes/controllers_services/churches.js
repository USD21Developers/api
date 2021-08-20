exports.GET = (req, res) => {
  const db = require("../../database-services");
  const sql = `
    SELECT 
      church_name,
      church_URL,
      mailing_city,
      mailing_state,
      mailing_country,
      church_iso
    FROM 
      churches
    ORDER BY
      church_iso,
      mailing_state,
      mailing_city
    ;
  `;

  db.query(sql, [], (err, result) => {
    if (err) {
      return res.status(500).send({ msg: "unable to query service for churches", msgType: "error" });
    }

    const data = result.map(item => {
      const { church_name, church_URL, mailing_city, mailing_state, mailing_country, church_iso } = item;
      return {
        name: church_name,
        url: church_URL,
        city: mailing_city,
        state: mailing_state,
        country: mailing_country,
        country_iso: church_iso
      }
    });

    return res.status(200).send(data);
  });
}
