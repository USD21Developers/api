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

function clearViews() {
  document.querySelectorAll(".view").forEach(item => item.classList.add("d-none"));
}

async function onSmsSubmit(e) {
  e.preventDefault();

  const accessToken = await getAccessToken();
  const endpoint = `${getApiHost()}/sendsms`;
  const category = document.querySelector("input[name=category]:checked").value;
  const gender = document.querySelector("input[name=gender]:checked").value;
  const message = document.querySelector("#message").value;

  // TODO:  Make these validations more robust
  if (!category || !category.length) return;
  if (!gender || !gender.length) return;
  if (!message.length) return;

  const spinner = document.querySelector("#spinner");
  const submitBtn = document.querySelector("#submit_sms");

  submitBtn.classList.add("d-none");
  spinner.classList.remove("d-none");

  fetch(endpoint, {
    mode: "cors",
    method: "POST",
    body: JSON.stringify({
      category: category,
      gender: gender,
      message: message
    }),
    headers: new Headers({
      "Content-Type": "application/json",
      authorization: `Bearer ${accessToken}`
    })
  })
    .then(res => res.json())
    .then(async (data) => {
      const viewEl = document.querySelector("#app");
      const formEl = document.querySelector("#sendsms");

      console.log(data);
      submitBtn.classList.remove("d-none");
      spinner.classList.add("d-none");

      formEl.reset();
      viewEl.scrollIntoView();
      await showToast("Message sent.");
    })
    .catch(err => {
      console.error(err);
      submitBtn.classList.remove("d-none");
      spinner.classList.add("d-none");
    });
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

async function onVerify(e) {
  e.preventDefault();
  document.querySelectorAll(".is-invalid").forEach(item => item.classList.remove("is-invalid"));
  alert("#alert_verify", "hide");

  sessionStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");

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
          alert("#alert_verify", "show", "A valid <nobr>e-mail</nobr> address is required.");
          break;
        case "usd21 e-mail account is required":
          alert("#alert_verify", "show", "You must use a <strong>USD21</strong> <nobr>e-mail</nobr> address to access this page.");
          break;
        case "unable to insert login token":
          alert("#alert_verify", "show", "An error occurred. Please try again.");
          break;
        case "confirmation e-mail could not be sent":
          alert("#alert_verify", "show", "An error occurred.  Please try again.");
          break;
        case "e-mail not found":
          alert("#alert_verify", "show", "This is not a recognized GLC Admin <nobr>e-mail</nobr> address.");
          break;
        case "confirmation e-mail sent":
          clearViews();
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

async function setInitialView() {
  const verifyEl = document.querySelector("#verify");
  const sendSmsEl = document.querySelector("#sendsms");
  const refreshToken = localStorage.getItem("refreshToken") || "";
  let isValidRefreshToken = true;

  if (!refreshToken) {
    isValidRefreshToken = false;
  } else if (!refreshToken.length) {
    isValidRefreshToken = false;
  } else if (refreshToken.split(".").length !== 3) {
    isValidRefreshToken = false;
  } else {
    const now = Date.now().valueOf() / 1000;
    const expiry = JSON.parse(atob(localStorage.getItem("refreshToken").split(".")[1])).exp || 0;
    if (now > expiry) {
      isValidRefreshToken = false;
    }
  };

  if (!isValidRefreshToken) {
    clearViews();
    verifyEl.classList.remove("d-none");
  } else {
    clearViews();
    sendSmsEl.classList.remove("d-none");
  }
}

function setListeners() {
  document.querySelector("#verify").addEventListener("submit", onVerify);
  document.querySelector("#sendsms").addEventListener("submit", onSmsSubmit);
  document.querySelector("#message").addEventListener("input", onTyped);
}

function init() {
  setInitialView();
  setListeners();
}

init();