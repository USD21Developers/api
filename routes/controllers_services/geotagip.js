exports.GET = (req, res) => {
  const axios = require("axios");
  const ip = req.clientIp;
  const endpoint = `https://ipgeolocation.abstractapi.com/v1/?api_key=${process.env.ABSTRACTAPI_IP_GEOLOCATION_KEY}&ip_address=${ip}`;

  axios.get(endpoint).then((response) => {
    res.status(200).send({
      msg: "IP geotagged",
      msgType: "success",
      geotaginfo: response.data,
    });
  });
};
