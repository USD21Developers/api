const NodeCache = require("node-cache");
const db = require("../../database-services");

const cache = new NodeCache();

function getSocials() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        csm.churchID,
        sp.name AS platform_name,
        csm.url
      FROM churchsocialmedia csm
      JOIN social_platforms sp ON csm.platform_id = sp.id
      ORDER BY csm.churchID
    `;

    db.query(sql, [], (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });
  });
}

function getChurches() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        churchID,
        isActive,
        church_name,
        church_URL,
        contact_name,
        contact_number,
        image AS contact_image,
        mailing_city,
        mailing_state,
        mailing_country,
        identifying_place,
        LCASE(country_iso) AS country_iso
      FROM churches
      WHERE isActive = 1
      ORDER BY country_iso, identifying_place, church_name
    `;

    db.query(sql, [], (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });
  });
}

exports.GET = async (req, res) => {
  const cachedData = cache.get("churchDirectory");
  if (cachedData) {
    return res.status(200).send({
      msg: "churches retrieved",
      msgType: "success",
      churches: cachedData,
    });
  }

  try {
    const [churchRows, socialRows] = await Promise.all([
      getChurches(),
      getSocials(),
    ]);

    const churchMap = {};

    churchRows.forEach((c) => {
      churchMap[c.churchID] = { ...c, socialMedia: [] };
    });

    socialRows.forEach((s) => {
      if (churchMap[s.churchID]) {
        churchMap[s.churchID].socialMedia.push({
          platform: s.platform_name,
          url: s.url,
        });
      }
    });

    const result = Object.values(churchMap);

    const oneWeek = 604800;
    cache.set("churchDirectory", result, oneWeek);

    return res.status(200).send({
      msg: "churches retrieved",
      msgType: "success",
      churches: result,
    });
  } catch (err) {
    console.error("church-directory error:", err);

    return res.status(500).send({
      msg: "unable to retrieve church directory",
      msgType: "error",
    });
  }
};
