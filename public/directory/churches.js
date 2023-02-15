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
  const directory = document.querySelector("#global-church-directory");
  const storedChurches = localStorage.getItem("churches");
  let storedCountries = localStorage.getItem("countries");
  const detectedLang = getLang();
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
    let syncChurchesNeeded = false;
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

      if (contact_image.length) imageCount++;

      const eagerLoadQuantity = 4;
      const lazyLoad = imageCount > eagerLoadQuantity ? 'loading="lazy"' : "";
      const churchName = church_URL.length
        ? `<a href="${church_URL}">${church_name}</a>`
        : church_name;
      const contactImage = contact_image.length
        ? contact_image
        : "https://www.upsidedown21.org/1.1/images/church_leaders/usd21.jpg";
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
          <strong>${churchName}</strong><br>
          ${mailing_city}, ${
        mailing_state.length ? mailing_state + "," : ""
      } ${mailing_country}<br>
          ${contact_name}<br>
          <strong>${contact_number}</strong>
        </div>
      </div>`;

      churchesInCountryHtml += churchHtml;
    });

    churchesHtml += churchesInCountryHtml;
  }

  directory.innerHTML = churchesHtml;

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

function init() {
  addStylesheet();
  addSpinner();
  showChurches();
}

init();
