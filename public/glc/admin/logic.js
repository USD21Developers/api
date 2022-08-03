function alert(selector, action = "show", message = "") {
  const alertEl = document.querySelector(selector);
  const msgEl = alertEl.querySelector("[role=alert]");
  if (action === "hide") {
    alertEl.classList.add("d-none");
    msgEl.innerHTML = "";
    return;
  }

  if (action === "show") {
    msgEl.innerHTML = message;
    alertEl.classList.remove("d-none");
    alertEl.scrollIntoView();
  }
}

function getAccessToken() {
  let needToRefresh = false;
  const accessToken = sessionStorage.getItem("accessToken") || "";
  const now = Date.now().valueOf() / 1000;
  let expiry = now;
  try {
    expiry = JSON.parse(atob(accessToken.split(".")[1])).exp;
    if (expiry < now) needToRefresh = true;
  } catch (err) {
    needToRefresh = true;
  }
  return new Promise((resolve, reject) => {
    if (!needToRefresh) return resolve(accessToken);
    const refreshToken = localStorage.getItem("refreshToken") || "";
    if (!refreshToken.length) return reject("refresh token missing");

    const endpoint = `${getAPIHost()}/invites/refresh-token`;

    fetch(endpoint, {
      mode: "cors",
      method: "POST",
      body: JSON.stringify({
        refreshToken: refreshToken,
      }),
      headers: new Headers({
        "Content-Type": "application/json",
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        switch (data.msg) {
          case "tokens renewed":
            const { accessToken, refreshToken } = data;
            localStorage.setItem("refreshToken", refreshToken);
            sessionStorage.setItem("accessToken", accessToken);
            const country =
              JSON.parse(atob(accessToken.split(".")[1])).country || "us";
            setCountry(country);
            resolve(accessToken);
            break;
          default:
            resolve("could not get access token");
            break;
        }
      })
      .catch((error) => {
        console.error(error);
      });
  });
}

function getApiHost() {
  let host;

  switch (window.location.hostname) {
    case "glc.usd21.org":
      host = "https://api.usd21.org/glc";
      break;
    default:
      host = `http://${window.location.hostname}:4000/glc`;
      break;
  }

  return host;
}

async function onVerify(e) {
  e.preventDefault();
  document.querySelectorAll(".is-invalid").forEach(item => item.classList.remove("is-invalid"));
  alert("#alert_verify", "hide");

  const emailEl = document.querySelector("#email");
  const email = e.target.email.value.trim();

  if (!email.length) {
    emailEl.classList.add("is-invalid");
    return;
  }

  const submitBtn = document.querySelector("#submit_verify");
  const spinner = document.querySelector("#spinner_verify");
  const controller = new AbortController();
  const endpoint = `${getApiHost()}/verify`;
  const accessToken = "";

  submitBtn.classList.add("d-none");
  spinner.classList.remove("d-none");

  fetch(endpoint, {
    mode: "cors",
    method: "POST",
    body: JSON.stringify({
      email: email
    }),
    headers: new Headers({
      "Content-Type": "application/json",
      authorization: `Bearer ${accessToken}`
    }),
    signal: controller.signal
  })
    .then(res => res.json())
    .then(data => {
      const { msg } = data;

      spinner.classList.add("d-none");
      submitBtn.classList.remove("d-none");

      switch (msg) {
        case "e-mail is missing":
          alert("#alert_verify", "show", "E-mail is required.");
          break;
        case "invalid e-mail format":
          alert("#alert_verify", "show", "A valid e-mail address is required.");
          break;
        case "usd21 e-mail account is required":
          alert("#alert_verify", "show", "You must use a USD21 e-mail address to access this page.");
          break;
        case "unable to insert login token":
          alert("#alert_verify", "show", "An error occurred. Please try again.");
          break;
        case "confirmation e-mail could not be sent":
          alert("#alert_verify", "show", "An error occurred.  Please try again.");
          break;
        case "confirmation e-mail sent":
          document.querySelectorAll(".view").forEach(item => item.classList.add("d-none"));
          document.querySelector("#checkemail").classList.remove("d-none");
          break;
      }
    })
    .catch(err => {
      console.error(err);
      spinner.classList.add("d-none");
      submitBtn.classList.remove("d-none");
    });

  setTimeout(() => {
    controller.abort();
    spinner.classList.add("d-none");
    submitBtn.classList.remove("d-none");
  }, 8000);
}

async function onSmsSubmit(e) {
  e.preventDefault();
}

function onTyped(e) {
  const charsMax = 160;
  const charsTyped = e.target.value.length;
  const charsLeft = charsMax - charsTyped;
  const charsLeftEl = document.querySelector("#charsleft");
  const charsLeftContainer = document.querySelector("#charsLeftContainer");

  charsLeftEl.innerHTML = charsLeft;
  if (charsLeft < 0) {
    charsLeftContainer.classList.remove("bg-dark");
    charsLeftContainer.classList.add("bg-danger");
  } else {
    charsLeftContainer.classList.add("bg-dark");
    charsLeftContainer.classList.remove("bg-danger");
  }
}

function setListeners() {
  document.querySelector("#verify").addEventListener("submit", onVerify);
  document.querySelector("#sendsms").addEventListener("submit", onSmsSubmit);
  document.querySelector("#message").addEventListener("input", onTyped);
}

function init() {
  setListeners();
}

init();