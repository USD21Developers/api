const crypto = require("crypto");

exports.POST = (req, res) => {
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-glc-test")
    : require("../../database-glc");
  const token = req.body.token || "";
  const newPassword = req.body.newPassword || "";
  const datakey = req.body.dataKey || "";
  const sql = `
    SELECT
      u.userid,
      t.token,
      t.expiry
    FROM
      users u
    INNER JOIN
      tokens t ON t.userid = u.userid
    WHERE
      t.token = ?
    AND
      t.purpose = 'password reset'
    LIMIT 1
    ;
  `;

  db.query(sql, [token], (error, result) => {
    if (error)
      return res
        .status(500)
        .send({ msg: "unable to query for token", msgType: "error" });
    if (!result.length)
      return res.status(404).send({ msg: "token not found", msgType: "error" });

    const userid = result[0].userid;
    const moment = require("moment");
    const dateExpiry = moment(result[0].expiry);
    const dateNow = moment();
    const isExpired = dateExpiry.isBefore(dateNow);

    if (isExpired)
      return res
        .status(400)
        .send({ msg: "token is expired", msgType: "error" });

    if (!newPassword.length)
      return res
        .status(400)
        .send({ msg: "password is missing", msgType: "error" });

    const utils = require("./utils");
    const isValidPassword = utils.validateNewPassword(newPassword);
    if (!isValidPassword)
      return res.status(400).send({
        msg: "new password lacks sufficient complexity",
        msgType: "error",
      });

    // Derive symmetric encryption key from password
    const kekSalt = crypto.randomBytes(32);
    const kekSaltBase64 = new Buffer.from(kekSalt).toString("base64");
    const kekIterations = 200000;
    const kekKeylen = 32;
    const kekDigest = "sha256";

    crypto.pbkdf2(
      newPassword,
      kekSalt,
      kekIterations,
      kekKeylen,
      kekDigest,
      (err, kek) => {
        if (err) {
          console.log(err);
          return res.status(500).send({
            msg: "unable to generate password hash",
            msgType: "error",
          });
        }

        const algorithm = "aes-256-cbc";
        const dekKeyLen = 32;
        const dek = crypto.randomBytes(dekKeyLen);
        const dekIv = crypto.randomBytes(16);
        const dekCipher = crypto.createCipheriv(algorithm, kek, dekIv);
        let dekCiphertext = dekCipher.update(dek, "utf-8", "base64");
        dekCiphertext += dekCipher.final("base64");

        const iv = crypto.randomBytes(16);
        const ivBase64 = new Buffer.from(iv).toString("base64");
        const cipher = crypto.createCipheriv(algorithm, dek, iv);
        let ciphertext = cipher.update(datakey, "utf-8", "base64");
        ciphertext += cipher.final("base64");

        const dekIvBase64 = new Buffer.from(dekIv).toString("base64");

        const passwordObj = JSON.stringify({
          kek: {
            salt: kekSaltBase64,
            iterations: kekIterations,
            keylen: kekKeylen,
            digest: kekDigest,
          },
          dek: {
            algorithm: algorithm,
            iv: dekIvBase64,
            ciphertext: dekCiphertext,
          },
        });

        const dataKeyObj = JSON.stringify({
          algorithm: algorithm,
          iv: ivBase64,
          ciphertext: ciphertext,
        });

        const sql = `
          UPDATE
            users
          SET
            password = ?,
            passwordmustchange = 0,
            datakey = ?
          WHERE
            userid = ?
          ;
        `;
        db.query(sql, [passwordObj, dataKeyObj, userid], (err, result) => {
          if (err) {
            console.log(err);

            return res.status(500).send({
              msg: "unable to store hashed password",
              msgType: "error",
            });
          }

          const sql = `
            UPDATE
              tokens
            SET
              claimed = 1
            WHERE
              token = ?
            ;
          `;
          db.query(sql, [token], (err, result) => {
            if (err) {
              console.log(err);

              return res.status(500).send({
                msg: "unable to designate token as claimed",
                msgType: "error",
              });
            }

            return res
              .status(200)
              .send({ msg: "password updated", msgType: "success" });
          });
        });
      }
    );
  });
};
