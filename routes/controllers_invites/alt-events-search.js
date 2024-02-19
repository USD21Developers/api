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

    const { geocodeLocation, geocodeLocation } = require("./utils");
    const coordsObject = await geocodeLocation(db, originLocation, country);

    resolve(coordsObject);
  });
}

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

  const { latitude, longitude } = await getCoordinates(
    db,
    originLocation,
    country
  );

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

  function getBoundingBox() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          MIN(ST_Y(locationcoordinates)) AS min_lat,
          MAX(ST_Y(locationcoordinates)) AS max_lat,
          MIN(ST_X(locationcoordinates)) AS min_long,
          MAX(ST_X(locationcoordinates)) AS max_long
        FROM
          events
        LIMIT
          1
        ;
      `;

      db.query(sql, [], (error, result) => {
        if (error) {
          console.log(error);
          reject(error);
        }

        if (!result.length) {
          const errorText =
            "cannot calculate bounding box because there are no records in the events table";
          console.log(errorText);
          reject(new Error(errorText));
        }

        const { min_lat, max_lat, min_long, max_long } = result[0];
        const bounding_box = {
          min_lat: min_lat + 0.01,
          max_lat: max_lat + 0.01,
          min_long: min_long + 0.01,
          max_long: max_long + 0.01,
        };

        resolve(bounding_box);
      });
    });
  }

  function getInPersonEvents(longitude, latitude, radiusInMeters) {
    return new Promise(async (resolve, reject) => {
      // TODO:  remember, startdate and multidaybegindate are for the INITIAL dates. As time goes on, recurring dates will need to be calculated from them programatically.
      const { min_lat, max_lat, min_long, max_long } = await getBoundingBox();

      const sql = `
        SELECT
          (
            ST_Distance_Sphere(e1.locationcoordinates, ST_GeomFromText('POINT(? ?)'))
          ) AS distance_in_meters,
          (
            distance_in_meters * 0.000621371192
          ) AS distance_in_miles,
          e1.eventid,
          e1.churchid,
          e1.type,
          e1.title,
          e1.frequency,
          e1.duration,
          e1.durationInHours,
          e1.timezone,
          e1.startdate,
          e1.multidaybegindate,
          e1.locationcoordinates,
          e1.hasvirtual,
          e1.country,
          e1.lang
        FROM
          events e1
        WHERE
          e1.isDeleted = 0
        AND
          e1.lang = ?
        AND
          ST_Y(locationcoordinates) BETWEEN ? AND ?
        AND
          ST_X(locationcoordinates) BETWEEN ? AND ?
        AND
          ST_Distance_Sphere(e1.locationcoordinates, ST_GeomFromText('POINT(? ?)'))
        AND
          distance_in_meters < ?
        ORDER BY
          distance_in_meters
        LIMIT
          20
        ;
      `;

      db.query(
        sql,
        [
          Number(longitude),
          Number(latitude),
          lang,
          min_lat,
          max_lat,
          min_long,
          max_long,
          Number(longitude),
          Number(latitude),
          radiusInMeters,
        ],
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

  const radiusInMeters = distanceInMeters(Number(radius), distanceUnit);
  const inPersonEvents = await getInPersonEvents(
    longitude,
    latitude,
    radiusInMeters
  );
  const virtualEvents = []; // TODO

  return res.status(200).send({
    msg: "alternative events retrieved",
    msgType: "success",
    events: {
      inPerson: inPersonEvents,
      virtual: virtualEvents,
    },
  });
};
