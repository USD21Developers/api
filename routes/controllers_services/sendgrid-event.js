exports.POST = (req, res) => {
  // Set database
  const db = require("../../database-services");

  const processEvent = (event) => {
    console.log(event);
  };

  var events = req.body;
  if (events && Array.isArray(events)) {
    events.forEach(function (event) {
      // Here, you now have each event and can process them how you like
      processEvent(event);
    });
  }

  return res.status(200).send();
};
