exports.POST = (req, res) => {
  const fs = require("fs");
  let lang = req.body.lang || "en";
  const pathDefault =
    "../../node_modules/world_countries_lists/data/countries/en/countries.json";
  const pathTried = `../../node_modules/world_countries_lists/data/countries/${lang
    .toLowerCase()
    .trim()}/countries.json`;
  let filePath = pathTried;

  if (lang.length !== 2) {
    return res.status(400).send({
      msg: "language code must be exactly 2 characters",
      msgType: "error",
    });
  }

  fs.stat(filePath, (err) => {
    if (err) {
      filePath = pathDefault;
    }

    const countryNames = {
      lang: lang,
      names: [],
    };

    countryNames.names = require(filePath).map((item) => {
      return {
        iso: item.alpha2,
        name: item.name,
      };
    });

    res.status(200).send({
      msg: "country names retrieved",
      msgType: "success",
      countryNames: countryNames,
    });
  });
};
