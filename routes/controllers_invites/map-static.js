const crypto = require("crypto");
const url = require("url");

exports.POST = async (req, res) => {
  "use strict";

  const {
    place,
    label,
    width = 400,
    height = 400,
    zoom = 12,
    maptype = "roadmap",
    markerColor = "red",
  } = req.body;

  // Validate

  // Place
  if (!place || !place.length) {
    return req.status(400).send({
      msg: "place is required",
      msgType: "error",
    });
  }

  // Label
  if (!label || !label.length) {
    return req.status(400).send({
      msg: "label is required",
      msgType: "error",
    });
  }

  // Width
  if (isNaN(width)) {
    return req.status(400).send({
      msg: "width must be numeric",
      msgType: "error",
    });
  }

  // Height
  if (isNaN(height)) {
    return req.status(400).send({
      msg: "height must be numeric",
      msgType: "error",
    });
  }

  // Zoom
  if (isNaN(zoom)) {
    return req.status(400).send({
      msg: "zoom must be numeric",
      msgType: "error",
    });
  }

  // Map Type
  const validMapTypes = ["roadmap", "satellite", "hybrid", "terrain"];
  if (!validMapTypes.includes(maptype)) {
    return req.status(400).send({
      msg: "maptype must be one of 'roadmap', 'satellite', 'hybrid' or 'terrain'",
      msgType: "error",
    });
  }

  // Map Type
  const validMarkerColors = [
    "red",
    "blue",
    "green",
    "yellow",
    "purple",
    "orange",
    "pink",
    "white",
    "black",
    "brown",
  ];
  if (!validMarkerColors.includes(markerColor)) {
    return req.status(400).send({
      msg: "markerColor must be one of 'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'white', 'black' or 'brown'",
      msgType: "error",
    });
  }

  const encodedLabel = encodeURIComponent(label);
  const encodedPlace = encodeURIComponent(place);
  const urlPrefix = "https://maps.googleapis.com";
  const urlBase = `/maps/api/staticmap?center=${encodedPlace}&zoom=${zoom}&size=${Math.abs(
    width
  )}x${Math.abs(
    height
  )}&maptype=${maptype}&markers=color:${markerColor}%7Clabel:${encodedLabel}&key=${
    process.env.GOOGLE_MAPS_API_KEY
  }`;
  const signature = sign(urlBase, process.env.GOOGLE_MAPS_URL_SIGNING_SECRET);
  const imageURL = `${urlPrefix}${urlBase}&signature=${signature}`;

  return req.status(200).send({
    msg: "image url generated",
    msgType: "success",
    imageURL: imageURL,
    height: height,
    width: width,
  });

  /**
   * Convert from 'web safe' base64 to true base64.
   *
   * @param  {string} safeEncodedString The code you want to translate
   *                                    from a web safe form.
   * @return {string}
   */
  function removeWebSafe(safeEncodedString) {
    return safeEncodedString.replace(/-/g, "+").replace(/_/g, "/");
  }

  /**
   * Convert from true base64 to 'web safe' base64
   *
   * @param  {string} encodedString The code you want to translate to a
   *                                web safe form.
   * @return {string}
   */
  function makeWebSafe(encodedString) {
    return encodedString.replace(/\+/g, "-").replace(/\//g, "_");
  }

  /**
   * Takes a base64 code and decodes it.
   *
   * @param  {string} code The encoded data.
   * @return {string}
   */
  function decodeBase64Hash(code) {
    // "new Buffer(...)" is deprecated. Use Buffer.from if it exists.
    return Buffer.from
      ? Buffer.from(code, "base64")
      : new Buffer(code, "base64");
  }

  /**
   * Takes a key and signs the data with it.
   *
   * @param  {string} key  Your unique secret key.
   * @param  {string} data The url to sign.
   * @return {string}
   */
  function encodeBase64Hash(key, data) {
    return crypto.createHmac("sha1", key).update(data).digest("base64");
  }

  /**
   * Sign a URL using a secret key.
   *
   * @param  {string} path   The url you want to sign.
   * @param  {string} secret Your unique secret key.
   * @return {string}
   */
  function sign(path, secret) {
    const uri = url.parse(path);
    const safeSecret = decodeBase64Hash(removeWebSafe(secret));
    const hashedSignature = makeWebSafe(encodeBase64Hash(safeSecret, uri.path));
    return url.format(uri) + "&signature=" + hashedSignature;
  }
};
