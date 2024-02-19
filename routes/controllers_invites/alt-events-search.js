const geolib = require("geolib");

exports.POST = async (req, res) => {
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

  const { latitude, longitude } =
    process.env.ENV === "development"
      ? { latitude: 33.6578204, longitude: -112.1342557 }
      : await getCoordinates(db, originLocation, country);

  const radiusInMeters = distanceInMeters(Number(radius), distanceUnit);
  const inPersonEvents = await getInPersonEvents(db);
  const virtualEvents = []; // TODO

  return res.status(200).send({
    msg: "alternative events retrieved",
    msgType: "success",
    inPersonEvents: inPersonEvents,
  });
};

function getInPersonEvents(db) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        DATE_ADD(startdate, INTERVAL (1 + TIMESTAMPDIFF(WEEK, startdate, NOW())) WEEK) AS eventDate
      FROM
        events
      WHERE
        startdate IS NOT NULL
      AND
        startdate < NOW()
      AND
        frequency <> 'once'
      AND
        isDeleted = 0

      UNION ALL

      SELECT
        startdate AS eventDate
      FROM
        events
      WHERE
        startdate IS NOT NULL
      AND
        startdate >= NOW()
      AND
        frequency <> 'once'
      AND
        isDeleted = 0
      
      UNION ALL

      SELECT
        multidaybegindate AS eventDate
      FROM
        events
      WHERE
        multidaybegindate IS NOT NULL
      AND
        multidaybegindate >= NOW()
      AND
        isDeleted = 0
      
      ORDER BY
        eventDate ASC
      ;
    `;

    db.query(sql, [], function (error, result) {
      if (error) {
        console.log(error);
        reject(error); // Reject the promise if there's an error
      }

      resolve(result);
    });
  });
}

function distanceInMeters(quantity, distanceUnit) {
  if (quantity <= 0) {
    throw new Error("Quantity must be a positive integer.");
  }

  let meters;
  switch (distanceUnit.toLowerCase()) {
    case "miles":
      meters = quantity * 1609.34; // 1 mile is approximately 1609.34 meters
      break;
    case "kilometers":
      meters = quantity * 1000; // 1 kilometer is 1000 meters
      break;
    default:
      throw new Error(
        'Invalid distance unit. Please use "miles" or "kilometers".'
      );
  }

  return meters;
}

function getInPersonEvents(db, lang, dateFromUTC, dateToUTC) {
  return new Promise(async (resolve, reject) => {
    /* const { minLat, maxLat, minLng, maxLng } = await geolib.getBounds([
      { latitude: latitude, longitude: longitude },
    ]); */

    const sql = `
      SELECT
        eventid,
        churchid,
        type,
        title,
        frequency,
        duration,
        durationInHours,
        timezone,
        startdate,
        CASE 
          WHEN startdate >= ? THEN startdate
          ELSE DATE_ADD(startdate, INTERVAL DATEDIFF(?, startdate) DIV 7 * 7 DAY)
        END AS future_date,
        locationcoordinates,
        hasvirtual,
        country,
        lang
      FROM
        events
      WHERE
        isDeleted = 0
      AND
        lang = ?
      AND startdate >= ?
      AND startdate <= ?
      LIMIT
        20
      ;
    `;

    db.query(
      sql,
      [dateFromUTC, dateFromUTC, lang, dateFromUTC, dateToUTC],
      (error, results) => {
        if (error) {
          console.log(error);
          reject(error);
        }

        resolve(results);
      }
    );
  });
}

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

function isLatLongPair(str) {
  // e.g. "40.689247,-74.044502"
  const regex =
    /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/;
  return regex.test(str);
}

function getCoordinates(db, originLocation, country) {
  return new Promise(async (resolve, reject) => {
    const isCoordinates = isLatLongPair(originLocation);
    if (isCoordinates) {
      const coords = originLocation.replaceAll(" ", "").split(",");
      const coordsObject = {
        latitude: coords[0],
        longitude: coords[1],
      };
      resolve(coordsObject);
    }

    const { geocodeLocation } = require("./utils");
    const coordsObject = await geocodeLocation(db, originLocation, country);

    resolve(coordsObject);
  });
}
