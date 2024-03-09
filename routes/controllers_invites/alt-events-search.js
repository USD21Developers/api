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
      : await getCoordinates(db, originLocation, country).catch((err) => {
          console.log(err, originLocation);
          return res.status(400).send({
            msg: "unable to geocode this location",
            msgType: "error",
            location: originLocation,
          });
        });

  const radiusInMeters = distanceInMeters(Number(radius), distanceUnit);

  const boundingBox = geolib.getBoundsOfDistance(
    { latitude, longitude },
    radiusInMeters
  );

  const inPersonRecurring = await getRecurringEvents({
    db: db,
    dateFromUTC: dateFromUTC,
    dateToUTC: dateToUTC,
    latitude: latitude,
    longitude: longitude,
    radiusInMeters: radiusInMeters,
    boundingBox: boundingBox,
    mustBeVirtual: false,
    userid: userid,
  });

  const inPersonOneTime = await getOneTimeEvents({
    db: db,
    dateFromUTC: dateFromUTC,
    dateToUTC: dateToUTC,
    latitude: latitude,
    longitude: longitude,
    radiusInMeters: radiusInMeters,
    boundingBox: boundingBox,
    mustBeVirtual: false,
    userid: userid,
  });

  const inPersonMultiday = await getMultidayEvents({
    db: db,
    dateFromUTC: dateFromUTC,
    dateToUTC: dateToUTC,
    latitude: latitude,
    longitude: longitude,
    radiusInMeters: radiusInMeters,
    boundingBox: boundingBox,
    mustBeVirtual: false,
    userid: userid,
  });

  const virtualRecurring = await getRecurringEvents({
    db: db,
    dateFromUTC: dateFromUTC,
    dateToUTC: dateToUTC,
    latitude: latitude,
    longitude: longitude,
    radiusInMeters: radiusInMeters,
    boundingBox: boundingBox,
    mustBeVirtual: true,
    userid: userid,
  });

  const virtualOneTime = await getOneTimeEvents({
    db: db,
    dateFromUTC: dateFromUTC,
    dateToUTC: dateToUTC,
    latitude: latitude,
    longitude: longitude,
    radiusInMeters: radiusInMeters,
    boundingBox: boundingBox,
    mustBeVirtual: true,
    userid: userid,
  });

  const virtualMultiday = await getMultidayEvents({
    db: db,
    dateFromUTC: dateFromUTC,
    dateToUTC: dateToUTC,
    latitude: latitude,
    longitude: longitude,
    radiusInMeters: radiusInMeters,
    boundingBox: boundingBox,
    mustBeVirtual: true,
    userid: userid,
  });

  return res.status(200).send({
    msg: "alternative events retrieved",
    msgType: "success",
    events: {
      inPerson: {
        recurring: inPersonRecurring,
        onetime: inPersonOneTime,
        multiday: inPersonMultiday,
      },
      virtual: {
        recurring: virtualRecurring,
        onetime: virtualOneTime,
        multiday: virtualMultiday,
      },
    },
  });
};

/**********************/
/*  HELPER FUNCTIONS  *
/**********************/

function removeDuplicateLocations(events, userid) {
  return new Promise((resolve, reject) => {
    if (!events) reject(new Error("events argument is required"));
    if (!userid) reject(new Error("userid argument is required"));
    if (!Array.isArray(events)) reject(new Error("events must be an array"));
    if (typeof userid !== "number")
      reject(new Error("userid must be a number"));
    if (!events.length) resolve(events);

    // Group events by event date
    const eventsByDate = events.reduce((acc, event) => {
      const dateKey = event.eventDate.toISOString().slice(0, 10); // Extract date without time
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      return acc;
    }, {});

    // Reduce events within 300 meters per date
    const reducedEvents = Object.values(eventsByDate).flatMap(
      (eventsOnDate) => {
        const filteredEvents = [];
        eventsOnDate.forEach((event) => {
          const eventsWithinRadius = filteredEvents.filter(
            (filteredEvent) =>
              geolib.getDistance(
                { latitude: event.latitude, longitude: event.longitude },
                {
                  latitude: filteredEvent.latitude,
                  longitude: filteredEvent.longitude,
                }
              ) <= 300
          );

          if (eventsWithinRadius.length === 0) {
            filteredEvents.push(event);
          } else {
            const sameUserEvents = eventsWithinRadius.filter(
              (e) => e.createdBy === event.createdBy && e.createdBy === userid
            );
            if (sameUserEvents.length > 0) {
              // Replace existing event with the current event
              const index = filteredEvents.indexOf(sameUserEvents[0]);
              filteredEvents[index] = event;
            } else {
              // If no same user event found, prioritize by createdBy
              const highestPriorityEvent = eventsWithinRadius.reduce(
                (prev, curr) => (prev.createdBy < curr.createdBy ? prev : curr)
              );
              if (event.createdBy < highestPriorityEvent.createdBy) {
                // Replace existing event with the current event
                const index = filteredEvents.indexOf(highestPriorityEvent);
                filteredEvents[index] = event;
              }
            }
          }
        });
        return filteredEvents;
      }
    );

    const maxQuantity = 20;

    const reducedQuantityOfEvents = reducedEvents.slice(0, maxQuantity);

    return resolve(reducedQuantityOfEvents);
  });
}

function getRecurringEvents(obj) {
  return new Promise((resolve, reject) => {
    const {
      db,
      dateFromUTC,
      dateToUTC,
      latitude,
      longitude,
      radiusInMeters,
      boundingBox,
      userid,
      mustBeVirtual,
    } = obj;

    const minLat = boundingBox[0].latitude;
    const minLon = boundingBox[0].longitude;
    const maxLat = boundingBox[1].latitude;
    const maxLon = boundingBox[1].longitude;

    const sql = `
      WITH RECURSIVE recurring_dates AS (
        SELECT 
          eventid,
          startdate AS eventDate,
          multidaybegindate,
          multidayenddate,
          type,
          title,
          frequency,
          duration,
          durationInHours,
          timezone,
          hasvirtual,
          country,
          lang,
          ST_Y(locationcoordinates) AS latitude,
          ST_X(locationcoordinates) AS longitude,
          ST_Distance_Sphere( POINT(?, ?), locationcoordinates) AS distanceInMeters,
          createdBy
        FROM 
          events
        WHERE 
          isDeleted = 0
        ${mustBeVirtual ? "AND hasvirtual = 1" : ""}
        AND
          frequency <> 'once'
        AND
          startdate < ?
        
        UNION

        SELECT 
          eventid,
          DATE_ADD(eventDate, INTERVAL 1 WEEK) AS eventDate,
          multidaybegindate,
          multidayenddate,
          type,
          title,
          frequency,
          duration,
          durationInHours,
          timezone,
          hasvirtual,
          country,
          lang,
          latitude,
          longitude,
          distanceInMeters,
          createdBy
        FROM 
          recurring_dates
        WHERE 
          eventDate < ?
      ) 
      SELECT 
        *
      FROM 
        recurring_dates
      WHERE 
        eventDate BETWEEN ? AND ?
      AND
        latitude BETWEEN ? AND ?
      AND
        longitude BETWEEN ? AND ?
      AND
        distanceInMeters <= ?
      ORDER BY 
        eventDate ASC
      ;
    `;

    db.query(
      sql,
      [
        longitude,
        latitude,
        dateToUTC,
        dateToUTC,
        dateFromUTC,
        dateToUTC,
        minLat,
        maxLat,
        minLon,
        maxLon,
        radiusInMeters,
      ],
      async (error, result) => {
        if (error) {
          console.log(error);
          return reject(error);
        }

        if (!result.length) {
          return resolve(result);
        }

        const duplicateLocationsRemoved = await removeDuplicateLocations(
          result,
          userid
        );

        return resolve(duplicateLocationsRemoved);
      }
    );
  });
}

function getOneTimeEvents(obj) {
  return new Promise((resolve, reject) => {
    const {
      db,
      dateFromUTC,
      dateToUTC,
      latitude,
      longitude,
      radiusInMeters,
      boundingBox,
      userid,
      mustBeVirtual,
    } = obj;

    const minLat = boundingBox[0].latitude;
    const minLon = boundingBox[0].longitude;
    const maxLat = boundingBox[1].latitude;
    const maxLon = boundingBox[1].longitude;

    const sql = `
      SELECT
        eventid,
        startdate AS eventDate,
        multidaybegindate,
        multidayenddate,
        type,
        title,
        frequency,
        duration,
        durationInHours,
        timezone,
        hasvirtual,
        country,
        lang,
        ST_Y(locationcoordinates) AS latitude,
        ST_X(locationcoordinates) AS longitude,
        ST_Distance_Sphere( POINT(?, ?), locationcoordinates) AS distanceInMeters,
        createdBy
      FROM
        events
      WHERE
        isDeleted = 0
      ${mustBeVirtual ? "AND hasvirtual = 1" : ""}
      AND
        frequency = 'once'
      AND
        startdate > ?
      AND
        startdate < ?
      AND
        ST_Y(locationcoordinates) BETWEEN ? AND ?
      AND
        ST_X(locationcoordinates) BETWEEN ? AND ?
      AND
        ST_Distance_Sphere( POINT(?, ?), locationcoordinates) <= ?
      ;
    `;

    db.query(
      sql,
      [
        longitude,
        latitude,
        dateFromUTC,
        dateToUTC,
        minLat,
        maxLat,
        minLon,
        maxLon,
        longitude,
        latitude,
        radiusInMeters,
      ],
      async (error, result) => {
        if (error) {
          console.log(error);
          return reject(error);
        }

        if (!result.length) {
          return resolve(result);
        }

        const duplicateLocationsRemoved = await removeDuplicateLocations(
          result,
          userid
        );

        return resolve(duplicateLocationsRemoved);
      }
    );
  });
}

function getMultidayEvents(obj) {
  return new Promise((resolve, reject) => {
    const {
      db,
      dateFromUTC,
      dateToUTC,
      latitude,
      longitude,
      radiusInMeters,
      boundingBox,
      userid,
      mustBeVirtual,
    } = obj;

    const minLat = boundingBox[0].latitude;
    const minLon = boundingBox[0].longitude;
    const maxLat = boundingBox[1].latitude;
    const maxLon = boundingBox[1].longitude;

    sql = `
      SELECT
        eventid,
        multidaybegindate AS eventDate,
        multidaybegindate AS multidaybegindate,
        multidayenddate,
        type,
        title,
        frequency,
        duration,
        durationInHours,
        timezone,
        hasvirtual,
        country,
        lang,
        ST_Y(locationcoordinates) AS latitude,
        ST_X(locationcoordinates) AS longitude,
        ST_Distance_Sphere( POINT(?, ?), locationcoordinates) AS distanceInMeters,
        createdBy
      FROM
        events
      WHERE
        isDeleted = 0
      ${mustBeVirtual ? "AND hasvirtual = 1" : ""}
      AND
        multidaybegindate > ?
      AND
        multidaybegindate < ?
      AND
        ST_Y(locationcoordinates) BETWEEN ? AND ?
      AND
        ST_X(locationcoordinates) BETWEEN ? AND ?
      AND
        ST_Distance_Sphere( POINT(?, ?), locationcoordinates) <= ?
      ORDER BY 
        eventDate ASC
      ;
    `;

    db.query(
      sql,
      [
        longitude,
        latitude,
        dateFromUTC,
        dateToUTC,
        minLat,
        maxLat,
        minLon,
        maxLon,
        longitude,
        latitude,
        radiusInMeters,
      ],
      async (error, result) => {
        if (error) {
          console.log(error);
          return reject(error);
        }

        if (!result.length) {
          return resolve(result);
        }

        const duplicateLocationsRemoved = await removeDuplicateLocations(
          result,
          userid
        );

        return resolve(duplicateLocationsRemoved);
      }
    );
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

    if (typeof coordsObject === "object") {
      const { lat, lng } = coordsObject;
      if (typeof lat === "number" && typeof lng === "number") {
        resolve(coordsObject);
      } else {
        reject(new Error("unable to geocode this location"));
      }
    } else {
      reject(new Error("unable to geocode this location"));
    }
  });
}
