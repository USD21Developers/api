exports.GET = async (req, res) => {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");
  console.log(privateKey);
  return res.status(200).send({
    msg: "sheet retrieved",
    msgType: "success",
    sheet: privateKey,
  });

  const { google } = require("googleapis");
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  async function readSheet() {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = "1CEvKYfYxoh2H5g0zovS4u_6pN4kxHMjwu-RlXJZ5BI4";
    const range = "Sheet1!A1:D4"; // adjust as needed

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return response.data.values;
  }

  const sheet = await readSheet();

  return res.status(200).send({
    msg: "sheet retrieved",
    msgType: "success",
    sheet: sheet,
  });
};
