exports.GET = (req, res) => {
  // const db = require("../../database-services");
  // const sql = ``;

  var events = req.body;
  events.forEach(function (event) {
    // Here, you now have each event and can process them how you like
    // processEvent(event);
    console.log(event);
  });

  return res.status(200).send();
};
