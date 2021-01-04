exports.POST = (req, res) => {
  const isStaging = req.headers.referrer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-test")
    : require("../../database");
  console.log(require("util").inspect(req.body, true, 7, true));
};
