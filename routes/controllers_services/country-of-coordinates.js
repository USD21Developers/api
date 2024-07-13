const axios = require("axios");

exports.POST = async (req, res) => {
  // Params
  const { latitude, longitude } = req.body;

  try {
    // Get country code from Google Maps Geocoding API
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    const response = await axios.get(url);

    console.log(url);
    console.log(response);

    if (
      response.data &&
      response.data.results &&
      response.data.results.length > 0
    ) {
      const addressComponents = response.data.results[0].address_components;
      let countryCode = "";

      for (let i = 0; i < addressComponents.length; i++) {
        const component = addressComponents[i];
        if (component.types.includes("country")) {
          countryCode = component.short_name.toLowerCase();
          break;
        }
      }

      return res.status(200).send({
        msg: "checked country of coordinates",
        msgType: "success",
        countryCode: countryCode,
      });
    } else {
      return res.status(400).send({
        msg: "error with geocoding service",
        msgType: "error",
        response: response,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      msg: "unable to check country of coordinates",
      msgType: "error",
      response: response,
    });
  }
};
