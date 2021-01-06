exports.POST = (req, res) => {
  // Enforce authorization
  const usertype = req.user.usertype;
  const allowedUsertypes = ["user"];
  if (!allowedUsertypes.includes(usertype)) {
    console.log(`User (userid ${req.user.userid}) is not authorized.`);
    return res.status(401).send({
      msg: "user is not authorized for this action",
      msgType: "error",
    });
  }
  const isStaging = req.headers.referer.indexOf("staging") >= 0 ? true : false;
  const db = isStaging
    ? require("../../database-test")
    : require("../../database");

  const {
    username = "",
    password = "",
    fullname = "",
    firstname = "",
    lastname = "",
    email = "",
    country = "",
  } = req.body;

  // return console.log(req.body);

  // Validate

  if (!username.length)
    return res
      .status(400)
      .send({ msg: "username is missing", msgType: "error" });

  if (!fullname.length)
    return res
      .status(400)
      .send({ msg: "full name is missing", msgType: "error" });

  if (!firstname.length)
    return res
      .status(400)
      .send({ msg: "first name is missing", msgType: "error" });

  if (!lastname.length)
    return res
      .status(400)
      .send({ msg: "last name is missing", msgType: "error" });

  if (!email.length)
    return res.status(400).send({ msg: "email is missing", msgType: "error" });

  const validator = require("email-validator");
  if (!validator.validate(email))
    return res.status(400).send({ msg: "invalid email", msgType: "error" });

  if (!country.length === 2)
    return res
      .status(400)
      .send({ msg: "country is missing", msgType: "error" });

  // Check for duplicate username
  const sql = `SELECT userid FROM users WHERE username = ? AND userid <> ? LIMIT 1;`;
  db.query(sql, [username, req.user.userid], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({
        msg: "unable to query for duplicate username",
        msgType: "error",
        error: err,
      });
    }
    if (result.length)
      return res
        .status(400)
        .send({ msg: "username already exists", msgType: "error" });

    // Check for duplicate e-mail address
    const sql = `SELECT userid FROM users WHERE email = ? AND userid <> ? LIMIT 1;`;
    db.query(sql, [email, req.user.userid], (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).send({
          msg: "unable to query for duplicate e-mail address",
        });
      }
      if (result.length)
        return res
          .status(400)
          .send({ msg: "e-mail already exists", msgType: "error " });

      // Update everything except the password (since password hashing is computationally expensive)
      const sql = `
        UPDATE
          users
        SET
          username = ?,
          firstname = ?,
          lastname = ?,
          fullname = ?,
          email = ?,
          country = ?
        WHERE
          userid = ?
        ;
      `;
      db.query(
        sql,
        [
          username,
          firstname,
          lastname,
          fullname,
          email,
          country,
          req.user.userid,
        ],
        (err, result) => {
          if (err) {
            console.log(err);
            return res
              .status(500)
              .send({ msg: "unable to update profile", msgType: "error" });
          }

          // Return out if password remains unchanged
          if (!password.length)
            return res
              .status(200)
              .send({ msg: "profile updated", msgType: "success" });

          // Validate password complexity
          const isValidPassword = require("./utils").validateNewPassword(
            password
          );
          if (!isValidPassword)
            return res
              .status(400)
              .send({ msg: "password not complex enough", msgType: "error" });

          // Hash the password
          const bcrypt = require("bcrypt");
          const saltRounds = 10;
          bcrypt.genSalt(saltRounds, (err, salt) => {
            if (err) {
              console.log(err);
              return res.status(500).send({
                msg: "unable to generate password salt",
                msgType: "error",
                error: err,
              });
            }
            bcrypt.hash(password, salt, (err, hash) => {
              if (err) {
                console.log(err);
                return res.status(500).send({
                  msg: "unable to generate password hash",
                  msgType: "error",
                  error: err,
                });
              }

              // Update the password
              const sql = `
                UPDATE
                  users
                SET
                  password = ?
                WHERE
                  userid = ?
                ;
              `;
              db.query(sql, [hash, req.user.userid], (err, result) => {
                if (err) {
                  console.log(err);
                  return res.status(500).send({
                    msg: "unable to update password",
                    msgType: "error",
                  });
                }

                return res
                  .status(200)
                  .send({ msg: "profile updated", msgType: "success" });
              });
            });
          });
        }
      );
    });
  });
};
