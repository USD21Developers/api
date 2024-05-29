exports.POST = async (req, res) => {
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
  const fetchChurches = require("../controllers_services/churches").FETCH;
  const churches = await fetchChurches();

  if (!Array.isArray(churches)) {
    return res
      .status(500)
      .send({ msg: "unable to retrieve churches", msgType: "error" });
  }

  const firstName = req.body.searchedFirstName || "";
  const lastName = req.body.searchedLastName || "";
  let churchid = req.body.churchid || "";

  if (typeof firstName !== "string") {
    return res
      .status(400)
      .send({ msg: "first name must be a string", msgType: "error" });
  }

  if (typeof lastName !== "string") {
    return res
      .status(400)
      .send({ msg: "last name must be a string", msgType: "error" });
  }

  if (!firstName.trim().length && !lastName.trim().length) {
    return res
      .status(400)
      .send({ msg: "name must not be blank", msgType: "error" });
  }

  if (churchid === "") {
    return res
      .status(400)
      .send({ msg: "churchid is required", msgType: "error" });
  } else {
    try {
      churchid = Math.abs(parseInt(churchid));
    } catch (err) {
      console.log(err);
    }
  }

  if (typeof churchid !== "number") {
    return res
      .status(400)
      .send({ msg: "churchid must be numeric", msgType: "error" });
  }

  let sql = `
    SELECT
      u.userid,
      u.firstname,
      u.astname,
      u.gender,
      u.profilephoto,
      COUNT(e.eventid) AS eventQuantity
    FROM
      users u
    LEFT OUTER JOIN events e ON (e.createdBy = u.userid AND e.sharewithfollowers = 'yes')
    WHERE
      u.userstatus = 'registered'
    AND
      u.userid <> ?
    AND
      u.churchid = ?
    `;

  let sqlPlaceholders;

  if (firstName.trim().length && lastName.trim().length) {
    sqlPlaceholders = [
      req.user.userid,
      churchid,
      `${firstName.trim()}%`,
      `${lastName.trim()}%`,
    ];
    sql += `
        AND
          (
            u.firstname LIKE ?

            AND

            u.lastname LIKE ?
          )
        ORDER BY
          lastname,
          firstname
        ;
      `;
  } else if (firstName.trim().length) {
    sqlPlaceholders = [req.user.userid, churchid, `${firstName.trim()}%`];
    sql += `
        AND
          u.firstname LIKE ?
        ORDER BY
          lastname,
          firstname
        ;
      `;
  } else if (lastName.trim().length) {
    sqlPlaceholders = [req.user.userid, churchid, `${lastName.trim()}%`];
    sql += `
        AND
          lastname LIKE ?
        ORDER BY
          lastname,
          firstname
        ;
      `;
  }

  db.query(sql, sqlPlaceholders, async (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send({
        msg: "unable to query other users in same congregation",
        msgType: "error",
      });
    }

    const searchResults = result;
    const getFollowedUsers = require("./utils").getFollowedUsers;
    const followedUsers = await getFollowedUsers(db, req.user.userid);

    // Filter out users that I'm already following
    const matches = searchResults.filter((searchResult) => {
      const isFollowed = followedUsers.find(
        (followed) => followed.userid === searchResult.userid
      );
      const includeMatch = !isFollowed;
      return includeMatch;
    });

    return res.status(200).send({
      msg: "users within specified congregation queried",
      msgType: "success",
      matches: matches,
    });
  });
};
