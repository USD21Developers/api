const crypto = require("crypto");
const url = require("url");
const { getAddressCoordinates } = require("./utils");

exports.POST = async (req, res) => {
  // Set database
  const isStaging =
    req.headers?.referer?.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");

  // Params
  const {
    place = "",
    label,
    width = 200,
    height = 200,
    zoom = 12,
    maptype = "roadmap",
    markerColor = "red",
  } = req.body;

  // Validate

  // Place
  if (!place || !place.length) {
    return res.status(400).send({
      msg: "place is required",
      msgType: "error",
    });
  }

  // Label
  if (!label || !label.length) {
    return res.status(400).send({
      msg: "label is required",
      msgType: "error",
    });
  }

  // Width
  if (isNaN(width)) {
    return res.status(400).send({
      msg: "width must be numeric",
      msgType: "error",
    });
  }

  // Height
  if (isNaN(height)) {
    return res.status(400).send({
      msg: "height must be numeric",
      msgType: "error",
    });
  }

  // Zoom
  if (isNaN(zoom)) {
    return res.status(400).send({
      msg: "zoom must be numeric",
      msgType: "error",
    });
  }

  // Map Type
  const validMapTypes = ["roadmap", "satellite", "hybrid", "terrain"];
  if (!validMapTypes.includes(maptype)) {
    return res.status(400).send({
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
    return res.status(400).send({
      msg: "markerColor must be one of 'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'white', 'black' or 'brown'",
      msgType: "error",
    });
  }

  const latLongRegex =
    /^([-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)),\s*([-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?))$/;
  const isCoordinates = latLongRegex.test(place);

  // TODO:  provide a way to parse different types of locations (not just coordinates)
  /* const {lat, lng} = await getAddressCoordinates(db, {
    country: "",
    line1: "",
    line2: "",
    line3: "",
  }); */

  const coordinates = isCoordinates ? encodeURIComponent(place) : place;
  const urlPrefix = "https://maps.googleapis.com";
  const urlBase = `/maps/api/staticmap?center=${coordinates}&zoom=${zoom}&scale=2&size=${Math.abs(
    width
  )}x${Math.abs(
    height
  )}&maptype=${maptype}&markers=color:${markerColor}|${coordinates}&key=${
    process.env.GOOGLE_MAPS_API_KEY
  }`;
  const signed = sign(urlBase, process.env.GOOGLE_MAPS_URL_SIGNING_SECRET);
  const imageURL = `${urlPrefix}${signed}`;

  return res.status(200).send({
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
    const signed = url.format(uri) + "&signature=" + hashedSignature;
    return signed;
  }
};
