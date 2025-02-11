exports.GET = (req, res) => {
  let lang = req.params["lang"] || "";
  let data = [];

  // Validate: lang must be 2 characters
  if (lang.length !== 2) {
    return res.status(400).send({
      msg: "language code must be exactly 2 characters",
      msgType: "error",
    });
  }

  // Attempt to load language, defaulting to English
  try {
    data = require(`world_countries_lists/data/countries/${lang
      .toLowerCase()
      .trim()}/countries.json`);
  } catch (e) {
    // console.log(e);
    lang = "en";
    data = require(`world_countries_lists/data/countries/${lang}/countries.json`);
  }

  // Use only the data we need
  const names = data.map((item) => {
    return {
      iso: item.alpha2,
      name: item.name,
    };
  });

  // Add missing jurisdictions
  const missing = [
    {
      iso: "cw",
      name: "Curacao",
    },
    {
      iso: "gu",
      name: "Guam",
    },
  ];

  // Insert missing jurisdictions
  missing.forEach((item) => {
    names.push(item);
  });

  // Sort again by jurisdiction name
  names.sort((a, b) => (a.name > b.name ? 1 : -1));

  // Return
  return res.status(200).send({
    msg: "country names retrieved",
    msgType: "success",
    countryNames: {
      lang: lang,
      names: names,
    },
  });
};
