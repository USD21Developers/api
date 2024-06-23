const axios = require("axios");
const apiKey = process.env.GOOGLE_MAPS_API_KEY;

exports.POST = (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["sysadmin", "user"];
  let isAuthorized = false;
  if (allowedUsertypes.includes(usertype)) isAuthorized = true;
  if (!isAuthorized) {
    console.log(`User (userid ${req.user.userid}) is not authorized.`);
    return res.status(401).send({
      msg: "user is not authorized for this action",
      msgType: "error",
    });
  }

  // Set database
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Parameters
  const cityName = req.body.cityName || null;
  const countryCode = req.body.countryCode || null;

  // Function to get geocode data
  async function getCityGeocode(cityName, countryCode, apiKey) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${cityName},${countryCode}&key=${apiKey}`;
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  // Function to extract latitude and longitude
  function extractLocation(geocodeData) {
    if (geocodeData.status === "OK") {
      const location = geocodeData.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    } else {
      return null;
    }
  }

  // Function to get city boundaries
  async function getCityBoundaries(lat, lng, apiKey) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  // Function to calculate zoom level
  function calculateZoomLevel(boundariesData) {
    const viewport = boundariesData.results[0].geometry.viewport;
    const northeast = viewport.northeast;
    const southwest = viewport.southwest;

    const latDiff = northeast.lat - southwest.lat;
    const lngDiff = northeast.lng - southwest.lng;

    const maxDiff = Math.max(latDiff, lngDiff);

    let zoomLevel;
    if (maxDiff > 0) {
      zoomLevel = Math.round(15 - maxDiff); // Simplified calculation
    } else {
      zoomLevel = 15; // Default zoom level
    }

    return zoomLevel;
  }

  (async () => {
    const geocodeData = await getCityGeocode(cityName, countryCode, apiKey);
    if (!geocodeData) {
      console.log("Failed to get geocode data.");
      return;
    }

    const location = extractLocation(geocodeData);
    if (!location) {
      console.log("Failed to extract location.");
      return;
    }

    const boundariesData = await getCityBoundaries(
      location.lat,
      location.lng,
      apiKey
    );
    if (!boundariesData) {
      console.log("Failed to get boundaries data.");
      return;
    }

    const zoomLevel = calculateZoomLevel(boundariesData);

    console.log(`City: ${cityName}, Country: ${countryCode}`);
    console.log(`Latitude: ${location.lat}, Longitude: ${location.lng}`);
    console.log(`Ideal Zoom Level: ${zoomLevel}`);

    const mapDefaults = {
      latitude: location.lat,
      longitude: location.lng,
      zoomLevel: location.zoomLevel,
    };

    return res.status(200).send({
      msg: "map defaults retrieved",
      msgType: "success",
      mapDefaults: mapDefaults,
    });
  })();
};
