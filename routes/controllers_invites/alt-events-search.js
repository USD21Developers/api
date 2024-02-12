function calculateZoomLevel(map, markers, origin, radius) {
  var bounds = new google.maps.LatLngBounds();
  bounds.extend(origin); // Extend bounds to include origin

  markers.forEach(function (marker) {
    bounds.extend(marker.getPosition());
  });

  var center = bounds.getCenter();
  var distance = google.maps.geometry.spherical.computeDistanceBetween(
    center,
    bounds.getNorthEast()
  );

  var zoomLevel = Math.floor(
    16 -
      Math.log2(((40075016.686 / (2 * radius)) * Math.sqrt(2) * distance) / 360)
  );

  return zoomLevel;
}

exports.POST = (req, res) => {
  // Set database
  const isStaging =
    req.headers?.referer?.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Parameters
  const eventid = Number(req.body.eventid) || null;
  const userid = Number(req.body.userid) || null;
  const recipientid = req.body.recipientid || null;
  const country = req.body.country;
  const countryFromIP = req.body.countryFromIP;
  const lang = req.body.lang;
  const originLocation = req.body.originLocation;
  const radius = req.body.radius;
  const distanceUnit = req.body.distanceUnit;
  const dateFromUTC = req.body.dateFromUTC;
  const dateToUTC = req.body.dateToUTC;

  // VALIDATE
  if (!eventid) {
    return res.status(400).send({
      msg: "eventid is required",
      msgType: "error",
    });
  }
  if (isNaN(eventid)) {
    return res.status(400).send({
      msg: "eventid must be numeric",
      msgType: "error",
    });
  }
  if (!userid) {
    return res.status(400).send({
      msg: "userid is required",
      msgType: "error",
    });
  }
  if (isNaN(userid)) {
    return res.status(400).send({
      msg: "userid must be numeric",
      msgType: "error",
    });
  }
  if (!recipientid || !recipientid.length) {
    return res.status(400).send({
      msg: "recipientid is required",
      msgType: "error",
    });
  }
  if (!country || !country.length) {
    return res.status(400).send({
      msg: "country is required",
      msgType: "error",
    });
  }
  if (!lang || lang.length !== 2) {
    return res.status(400).send({
      msg: "lang is required and must be 2 characters",
      msgType: "error",
    });
  }
  if (!originLocation) {
    return res.status(400).send({
      msg: "originLocation is required",
      msgType: "error",
    });
  }
  if (!radius) {
    return res.status(400).send({
      msg: "radius is required",
      msgType: "error",
    });
  }
  if (isNaN(radius)) {
    return res.status(400).send({
      msg: "radius must be numeric",
      msgType: "error",
    });
  }
  if (!distanceUnit) {
    return res.status(400).send({
      msg: "distanceUnit is required",
      msgType: "error",
    });
  }
  if (!["miles", "kilometers"].includes(distanceUnit)) {
    return res.status(400).send({
      msg: "distanceUnit must be either miles or kilometers",
      msgType: "error",
    });
  }
  if (!dateFromUTC || !dateFromUTC.length) {
    return res.status(400).send({
      msg: "dateFromUTC is required",
      msgType: "error",
    });
  }
  if (!dateToUTC || !dateToUTC.length) {
    return res.status(400).send({
      msg: "dateToUTC is required",
      msgType: "error",
    });
  }

  // MAIN LOGIC

  const events = []; // Populate this from the DB

  return res.status(200).send({
    msg: "alternative events retrieved",
    msgType: "success",
    events: events,
  });
};
