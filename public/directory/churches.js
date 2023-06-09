function addSpinner() {
  const directory = document.querySelector("#global-church-directory");
  const spinnerHtml = `<div align="center"><img src="https://api.usd21.org/_assets/spinner.svg" width="100" height="100" style="max-width: 100%; margin-bottom: 40px" /></div>`;
  directory.innerHTML = spinnerHtml;
}

function addStylesheet() {
  const url = `${getApiPrefix()}/../directory/style.css`;
  const link = document.createElement("link");

  link.setAttribute("rel", "stylesheet");
  link.setAttribute("type", "text/css");
  link.setAttribute("href", url);
  document.querySelector("head").appendChild(link);
}

function getApiPrefix() {
  let host =
    window.location.host === "localhost"
      ? "http://localhost:4000/services"
      : "https://api.usd21.org/services";
  return host;
}

function getChurches() {
  const endpoint = `${getApiPrefix()}/church-directory`;

  return new Promise((resolve, reject) => {
    fetch(endpoint, {
      cache: "no-store",
      keepalive: true,
    })
      .then((res) => res.json())
      .then(async (data) => {
        const churchesToStore = JSON.stringify(data.churches);
        localStorage.setItem("churches", churchesToStore);
        resolve(data.churches);
      })
      .catch((err) => reject(new Error(err)));
  });
}

function getCountries(lang) {
  const endpoint = `${getApiPrefix()}/country-names/${lang}`;

  return new Promise((resolve, reject) => {
    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        const countryData = data.countryNames;
        localStorage.setItem("countries", JSON.stringify(countryData));
        resolve(countryData);
      });
  });
}

function getLang() {
  const lang = navigator.language.substring(0, 2) || "en";
  return lang;
}

function getPhrases() {
  const phrases = {
    ar: {
      language: "Arabic",
      label: "ترتيب حسب:",
      churchName: "اسم الكنيسة",
      country: "دولة",
      website: "موقع إلكتروني",
    },
    zh: {
      language: "Chinese (Simplified)",
      label: "排序方式：",
      churchName: "教会名称",
      country: "国家",
      website: "网站",
    },
    en: {
      language: "English",
      label: "Sort by:",
      churchName: "Church name",
      country: "Country",
      website: "Web site",
    },
    tl: {
      language: "Filipino/Tagalog",
      label: "Pagbukud-bukurin ayon sa:",
      churchName: "pangalan ng simbahan",
      country: "bansa",
      website: "Website",
    },
    fr: {
      language: "French",
      label: "Trier par:",
      churchName: "church name",
      country: "nom de l'église",
      website: "Site Internet",
    },
    de: {
      language: "German",
      label: "Sortiere nach:",
      churchName: "Kirchenname",
      country: "Land",
      website: "Webseite",
    },
    hi: {
      language: "Hindi",
      label: "इसके अनुसार क्रमबद्ध करें:",
      churchName: "चर्च का नाम",
      country: "देश",
      website: "वेबसाइट",
    },
    it: {
      language: "Italian",
      label: "Ordina per:",
      churchName: "nome della chiesa",
      country: "Paese",
      website: "Sito web",
    },
    ja: {
      language: "Japanese",
      label: "並び替え：",
      churchName: "教会名",
      country: "国",
      website: "Webサイト",
    },
    ko: {
      language: "Korean",
      label: "정렬 기준:",
      churchName: "교회 이름",
      country: "국가",
      website: "웹사이트",
    },
    pl: {
      language: "Polish",
      label: "Sortuj według:",
      churchName: "nazwa kościoła",
      country: "kraj",
      website: "Strona internetowa",
    },
    pt: {
      language: "Portuguese",
      label: "Ordenar por:",
      churchName: "nome da igreja",
      country: "país",
      website: "Local na rede Internet",
    },
    ru: {
      language: "Russian",
      label: "Веб-сайт",
      churchName: "церковное имя",
      country: "страна",
      website: "Веб-сайт",
    },
    es: {
      language: "Spanish",
      label: "Ordenar por:",
      churchName: "Nombre de la iglesia",
      country: "País",
      website: "Sitio web",
    },
    sw: {
      language: "Swahili",
      label: "Panga kwa:",
      churchName: "jina la kanisa",
      country: "nchi",
      website: "Tovuti",
    },
    sv: {
      language: "Swedish",
      label: "Sortera efter:",
      churchName: "kyrkonamn",
      country: "Land",
      website: "Hemsida",
    },
    ta: {
      language: "Tamil",
      label: "இதன்படி வரிசைப்படுத்தவும்:",
      churchName: "தேவாலயத்தின் பெயர்",
      country: "நாடு",
      website: "இணையதளம்",
    },
    uk: {
      language: "Ukranian",
      label: "Сортувати за:",
      churchName: "церковна назва",
      country: "країна",
      website: "Веб-сайт",
    },
    vi: {
      language: "Vietnamese",
      label: "Sắp xếp theo:",
      churchName: "tên nhà thờ",
      country: "quốc gia",
      website: "Trang mạng",
    },
    xx: {
      language: "",
      label: "Sort by:",
      churchName: "church name",
      country: "country",
      website: "Website",
    },
  };
  const lang = getLang();
  const returnObject = phrases[lang] ? phrases[lang] : phrases["en"];

  return returnObject;
}

function getSortOptionsHtml(
  sortByNameChecked = "checked",
  sortByCountryChecked = ""
) {
  const { label, churchName, country } = getPhrases();
  return `
    <form id="churchDirectorySort">
      ${label} 
      <label for="churchDirectorySortByName">
        <input type="radio" name="sortby" id="churchDirectorySortByName" value="name" ${sortByNameChecked} />
        ${churchName}
      </label>
      <label for="churchDirectorySortByCountry">
        <input type="radio" name="sortby" id="churchDirectorySortByCountry" value="country" ${sortByCountryChecked} />
        ${country}
      </label>
    </form>
    <br>
  `;
}

async function hash(str) {
  const buf = await window.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder("utf-8").encode(str)
  );
  return Array.prototype.map
    .call(new Uint8Array(buf), (x) => ("00" + x.toString(16)).slice(-2))
    .join("");
}

async function showChurches() {
  let sortMethod = "alphabetically"; // alphabetically | byCountry
  let sortMethodStored =
    localStorage.getItem("churchDirectorySortMethod") || "";

  if (sortMethodStored === "") {
    localStorage.setItem("churchDirectorySortMethod", "alphabetically");
    sortMethodStored = "alphabetically";
  }

  if (sortMethodStored !== sortMethod) {
    sortMethod = sortMethodStored;
  }

  // return showChurchesByCountry();

  if (sortMethod === "alphabetically") {
    showChurchesAlphabetically();
  } else if (sortMethod === "byCountry") {
    showChurchesByCountry();
  } else {
    localStorage.setItem("churchDirectorySortMethod", "alphabetically");
    showChurchesAlphabetically();
  }
}

async function showChurchesAlphabetically() {
  const directory = document.querySelector("#global-church-directory");
  const storedChurches = localStorage.getItem("churches");
  const { website } = getPhrases();
  let syncChurchesNeeded = true;
  let churches;
  if (storedChurches) {
    churches = JSON.parse(storedChurches);
  } else {
    churches = await getChurches();
    syncChurchesNeeded = false;
  }

  let churchesHtml = "";

  let imageCount = 0;

  churches.sort((a, b) => (a.church_name > b.church_name ? 1 : -1));

  churches.forEach((item) => {
    const {
      contact_image,
      church_name,
      church_URL,
      mailing_city,
      mailing_state,
      mailing_country,
      contact_name,
      contact_number,
    } = item;

    if (contact_image && contact_image.length) imageCount++;

    const eagerLoadQuantity = 4;
    const lazyLoad =
      imageCount > eagerLoadQuantity
        ? 'loading="lazy" decoding="async" fetchpriority="low"'
        : "";

    const contactImage =
      contact_image && contact_image.length
        ? contact_image
        : "https://www.upsidedown21.org/1.1/images/church_leaders/usd21.jpg";

    const websiteLink = church_URL.length
      ? `<div><a href="${church_URL}">${website}</a></div>`
      : "";

    let churchHtml = `
      <div class="church">
        <div class="photo">
          <img vspace="5" width="100" src="${contactImage}" ${lazyLoad} alt="Photo of ${contact_name
      .trim()
      .replaceAll(
        "&",
        "and"
      )}" onerror="this.onerror=null;this.src='https://www.upsidedown21.org/1.1/images/church_leaders/usd21.jpg';" />
        </div>
        <div class="info">
          <strong>${church_name}</strong><br>
          ${mailing_city.trim()}, ${
      mailing_state.length ? mailing_state.trim() + "," : ""
    } ${mailing_country.trim()}<br>
          ${contact_name}<br>
          <strong>${contact_number}</strong>

          ${websiteLink}
        </div>
      </div>
    `;

    churchesHtml += churchHtml;
  });

  let sortByNameChecked = "checked";
  let sortByCountryChecked = "";

  const sortOptionsHTML = getSortOptionsHtml(
    sortByNameChecked,
    sortByCountryChecked
  );

  churchesHtml = sortOptionsHTML + churchesHtml;

  directory.innerHTML = churchesHtml;

  document.querySelector("#churchDirectorySortByName").checked = true;

  attachChurchDirectoryEventListeners();

  if (syncChurchesNeeded) syncChurches();
}

async function showChurchesByCountry() {
  const directory = document.querySelector("#global-church-directory");
  const storedChurches = localStorage.getItem("churches");
  let storedCountries = localStorage.getItem("countries");
  const detectedLang = getLang();
  const { website } = getPhrases();
  let lang = "en";
  let syncChurchesNeeded = true;

  let countryData;
  let countries;
  if (storedCountries) {
    countryData = JSON.parse(storedCountries);

    if (countryData.lang !== detectedLang) {
      countryData = await getCountries(detectedLang);
    } else {
      getCountries(detectedLang); // Silently updates countries in localStorage for next reload
    }
  } else {
    countryData = await getCountries(getLang());
  }
  lang = countryData.lang;
  countries = countryData.names;
  countries.sort((a, b) => (a.name > b.name ? 1 : -1));

  let churches;
  if (storedChurches) {
    churches = JSON.parse(storedChurches);
  } else {
    churches = await getChurches();
    syncChurchesNeeded = false;
  }

  let churchesHtml = "";

  let imageCount = 0;

  for (let i = 0; i < countries.length; i++) {
    const countryIso = countries[i].iso;
    let countryName = countries[i].name;
    const churchesInCountry = churches.filter(
      (item) => item.country_iso === countryIso
    );

    if (lang === "en") {
      switch (countryIso) {
        case "bo":
          countryName = "Bolivia";
          break;
        case "cd":
          countryName = "Democratic Republic of the Congo";
          break;
        case "gb":
          countryName = "United Kingdom";
          break;
        case "us":
          countryName = "United States";
          break;
      }
    }

    let churchesInCountryHtml = "";

    if (!churchesInCountry.length) continue;

    churchesHtml += `
      <div class="country">
        <strong>${countryName.toUpperCase()}:</strong>
      </div>
    `;

    churchesInCountry.sort((a, b) => (a.church_name > b.church_name ? 1 : -1));

    churchesInCountry.forEach((item) => {
      const {
        contact_image,
        church_name,
        church_URL,
        mailing_city,
        mailing_state,
        mailing_country,
        contact_name,
        contact_number,
      } = item;

      if (contact_image && contact_image.length) imageCount++;

      const eagerLoadQuantity = 4;
      const lazyLoad =
        imageCount > eagerLoadQuantity
          ? 'loading="lazy" decoding="async" fetchpriority="low"'
          : "";
      const contactImage = contact_image.length
        ? contact_image
        : "https://www.upsidedown21.org/1.1/images/church_leaders/usd21.jpg";
      const websiteLink = church_URL.length
        ? `<div><a href="${church_URL}">${website}</a></div>`
        : "";
      const name = contact_name.trim().replaceAll("&", "and");
      let churchHtml = `
        <div class="church">
          <div class="photo">
            <img vspace="5" width="100" src="${contactImage}" ${lazyLoad} alt="Photo of ${name}" onerror="this.onerror=null;this.src='https://www.upsidedown21.org/1.1/images/church_leaders/usd21.jpg';" />
          </div>
          <div class="info">
            <strong>${church_name}</strong><br>
            ${mailing_city}, ${
        mailing_state.length ? mailing_state + "," : ""
      } ${mailing_country}<br>
            ${contact_name}<br>
            <strong>${contact_number}</strong>

            ${websiteLink}
          </div>
        </div>
      `;

      churchesInCountryHtml += churchHtml;
    });

    churchesHtml += churchesInCountryHtml;
  }

  let sortByNameChecked = "checked";
  let sortByCountryChecked = "";

  const sortOptionsHTML = getSortOptionsHtml(
    sortByNameChecked,
    sortByCountryChecked
  );

  churchesHtml = sortOptionsHTML + churchesHtml;

  directory.innerHTML = churchesHtml;

  document.querySelector("#churchDirectorySortByCountry").checked = true;

  attachChurchDirectoryEventListeners();

  if (syncChurchesNeeded) syncChurches();
}

async function syncChurches() {
  const storedChurches = localStorage.getItem("churches");

  if (!navigator.onLine) return;

  const fetchedChurches = await getChurches();

  if (!fetchedChurches) return;

  const storedChurchesHash = await hash(storedChurches);
  const fetchedChurchesJSON = JSON.stringify(fetchedChurches);
  const fetchedChurchesHash = await hash(fetchedChurchesJSON);

  if (fetchedChurchesHash !== storedChurchesHash) {
    localStorage.setItem("churches", fetchedChurchesJSON);
    showChurches();
  }
}

function attachChurchDirectoryEventListeners() {
  const directoryEl = document.querySelector("#global-church-directory");
  const sortByNameEl = document.querySelector("#churchDirectorySortByName");
  const sortByCountryEl = document.querySelector(
    "#churchDirectorySortByCountry"
  );

  sortByNameEl.addEventListener("click", (e) => {
    localStorage.setItem("churchDirectorySortMethod", "alphabetically");
    directoryEl.innerHTML = "";
    addSpinner();
    showChurches();
  });

  sortByCountryEl.addEventListener("click", (e) => {
    localStorage.setItem("churchDirectorySortMethod", "byCountry");
    directoryEl.innerHTML = "";
    addSpinner();
    showChurches();
  });
}

function init() {
  addStylesheet();
  addSpinner();
  showChurches();
}

init();
