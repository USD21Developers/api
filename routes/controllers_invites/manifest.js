exports.GET = (req, res) => {
  let localizedContent = {
    name: {
      en: "Invites",
    },
    short_name: {
      en: "Invites",
    },
    description: {
      en: "The Invites app is a tool for members in good standing with the International Christian Churches (a.k.a. SoldOut Discipling Movement), online at usd21.org.  It enables users to send digital invites to people that they invite to church functions, such as Sunday services or small discussion groups known as Bible Talks.",
    },
    screenshots: {
      en: [],
    },
  };

  let manifest = {
    name: localizedContent.name.en,
    short_name: localizedContent.short_name.en,
    description: localizedContent.description.en,
    icons: [
      {
        src: "https://invites.mobi/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "https://invites.mobi/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "https://invites.mobi/maskable-android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "https://invites.mobi/maskable-android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    theme_color: "#102951",
    background_color: "#8882d3",
    display: "standalone",
    orientation: "portrait",
    start_url: "https://invites.mobi/?utm_source=homescreen",
    id: "03420b27-a52f-4643-af3a-857d238673dd",
    dir: "auto",
    scope: "/",
    categories: ["productivity", "religion"],
  };

  if (req.cookies.preAuthArray) {
    const strPreAuthArray = req.cookies.preAuthArray;
    const preAuthArray = strPreAuthArray.split(",").map(Number);
    const churchid = preAuthArray[0];
    const authorizedby = preAuthArray[1];
    const authcode = preAuthArray[2];

    manifest.start_url = `${manifest.start_url}&churchid=${churchid}&authorizedby=${authorizedby}&authcode=${authcode}`;
  }

  let preferredLanguage = req.headers["accept-language"];

  let favoriteLanguages = preferredLanguage
    ? preferredLanguage.split(",")
    : ["en"];

  favoriteLanguages.reverse();

  favoriteLanguages.forEach(function (fullLanguageCode) {
    let simplifiedCode = fullLanguageCode.slice(0, 2);

    if (localizedContent.name[simplifiedCode]) {
      manifest.name = localizedContent.name[simplifiedCode];
    }

    if (localizedContent.short_name[simplifiedCode]) {
      manifest.short_name = localizedContent.short_name[simplifiedCode];
    }

    if (localizedContent.description[simplifiedCode]) {
      manifest.description = localizedContent.description[simplifiedCode];
    }

    if (localizedContent.screenshots[simplifiedCode]) {
      manifest.screenshots = localizedContent.screenshots[simplifiedCode];
    }
  });

  res.setHeader("Content-Type", "application/json");

  res.status(200).send(manifest);
};
