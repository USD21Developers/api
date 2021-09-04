const crypto = require("crypto");

exports.POST = (req, res) => {
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-invites-test")
    : require("../../database-invites");
  const username = req.body.username || "";
  const password = req.body.password || "";

  const sql = `
    SELECT
      userid,
      password,
      firstname,
      lastname,
      usertype,
      userstatus,
      lang,
      country,
      datakey,
      passwordmustchange,
      isAuthorized,
      canAuthorize,
      canAuthToAuth,
      UTC_TIMESTAMP AS now
    FROM
      users
    WHERE
      username = ?
    LIMIT
      1
    ;
  `;
  db.query(sql, [username], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({
        msg: "unable to query for user",
        msgType: "error",
      });
    }

    if (!result.length)
      return res.status(404).send({
        msg: "invalid login",
        msgType: "error",
      });

    const passwordFromDB = JSON.parse(result[0].password);
    const firstname = result[0].firstname || "";
    const lastname = result[0].lastname || "";
    const userid = result[0].userid || 0;
    const usertype = result[0].usertype || "user";
    const userstatus = result[0].userstatus || "pending confirmation";
    const lang = result[0].lang || "en";
    const country = result[0].country || "us";
    const passwordmustchange =
      result[0].passwordmustchange === 1 ? true : false;
    const isAuthorized =
      result[0].isAuthorized === 1 ? true : false;
    const canAuthorize =
      result[0].canAuthorize === 1 ? true : false;
    const canAuthToAuth =
      result[0].canAuthToAuth === 1 ? true : false;
    const datakey = JSON.parse(result[0].datakey);

    if (userstatus !== "registered") {
      return res
        .status(400)
        .send({ msg: "user status is not registered", msgType: "error" });
    }

    // Derive KEK and DEK from stored password
    const saltBase64 = new Buffer.from(passwordFromDB.kek.salt, "base64");
    crypto.pbkdf2(password, saltBase64, passwordFromDB.kek.iterations, passwordFromDB.kek.keylen, passwordFromDB.kek.digest, (err, kek) => {
      if (err)
        return res.status(500).send({
          msg: "unable to verify login",
          msgType: "error",
        });

      // Decrypt DEK in password field of DB
      let decryptedDEK;
      let dek;
      try {
        const dekIv = new Buffer.from(passwordFromDB.dek.iv, "base64");
        const decipher = crypto.createDecipheriv(passwordFromDB.dek.algorithm, kek, dekIv);
        decryptedDEK = decipher.update(passwordFromDB.dek.ciphertext, "base64", "base64");
        decryptedDEK += decipher.final("base64");
        dek = new Buffer.from(decryptedDEK, "base64");
      } catch (err) {
        console.log(err);
        return res.status(404).send({
          msg: "invalid login",
          msgType: "error"
        });
      }

      // Decrypt browser's data key
      let decryptedDataKey;
      try {
        const dataKeyIv = new Buffer.from(datakey.iv, "base64");
        const decipher = crypto.createDecipheriv(datakey.algorithm, dek, dataKeyIv);
        decryptedDataKey = decipher.update(datakey.ciphertext, "base64", "utf-8");
        decryptedDataKey += decipher.final("utf-8");
      } catch (err) {
        console.log(err);
        return res.status(404).send({
          msg: "unable to decrypt datakey",
          msgType: "error"
        });
      }

      const jsonwebtoken = require("jsonwebtoken");
      const refreshToken = jsonwebtoken.sign(
        {
          userid: userid,
          usertype: usertype,
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "30d" }
      );

      const accessToken = jsonwebtoken.sign(
        {
          firstname: firstname,
          lastname: lastname,
          userid: userid,
          usertype: usertype,
          lang: lang,
          country: country,
          passwordmustchange: passwordmustchange,
          isAuthorized: isAuthorized,
          canAuthorize: canAuthorize,
          canAuthToAuth: canAuthToAuth
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "10m" }
      );

      // Set return object
      let returnObject = {
        msg: "user authenticated",
        msgType: "success",
        refreshToken: refreshToken,
        accessToken: accessToken,
        datakey: decryptedDataKey
      };

      return res.status(200).send(returnObject);

    });
  });
};
