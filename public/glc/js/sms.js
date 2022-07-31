var iti;

function customScrollTo(selector) {
  const element = document.querySelector(selector);
  const offset = 94;
  const bodyRect = document.body.getBoundingClientRect().top;
  const elementRect = element.getBoundingClientRect().top;
  const elementPosition = elementRect - bodyRect;
  const offsetPosition = elementPosition - offset;

  window.scrollTo({ top: offsetPosition, behavior: "smooth", block: "center" });
  if (!isMobileDevice()) element.focus();
}

function initTelInput() {
  const input = document.querySelector("#phone");
  iti = window.intlTelInput(input, {
    initialCountry: "us",
    preferredCountries: ["us"],
    utilsScript:
      "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.18/js/utils.min.js",
  });

  iti.promise.then(() => {
    const height = document.querySelector("#phone").clientHeight;
    const phoneContainer = document.querySelector(".iti.iti--allow-dropdown");
    const flagContainer = document.querySelector(".iti__flag-container");

    flagContainer.style.maxHeight = `${height}px`;
    const errElement = document.createElement("div");
    errElement.setAttribute("class", "invalid-feedback");
    errElement.innerText = "A valid phone number is required";
    phoneContainer.append(errElement);
  });
}

function isMobileDevice() {
  const result =
    typeof window.orientation !== "undefined" ||
    navigator.userAgent.indexOf("IEMobile") !== -1;
  return result;
}

function onSubmit(evt) {
  const alert = document.querySelector("#alertContainer");
  const spinnerEl = document.querySelector("#submitContainer");
  const submitEl = document.querySelector("#submitContainer");
  const endpoint = getApiEndpoint();
  const redirectURL = "../sms-thanks/";
  const ac = new AbortController();
  const formObject = {
    phone: iti.getNumber(),
    countrydata: iti.getSelectedCountryData(),
    firstname: document.querySelector("#firstname").value,
    lastname: document.querySelector("#lastname").value,
    nextevent: document.querySelector("#cat_nextevent").checked ? 1 : 0,
    announcements: document.querySelector("#cat_announcements").checked
      ? 1
      : 0,
    gender: document.querySelector("input[name=gender]:checked")?.value,
  };

  evt.preventDefault();

  const isValid = validate();

  if (!isValid) return;

  alert.classList.add("d-none");

  submitEl.classList.add("d-none");
  spinnerEl.classList.remove("d-none");

  fetch(endpoint, {
    mode: "cors",
    method: "POST",
    body: JSON.stringify(formObject),
    headers: new Headers({
      "Content-Type": "application/json",
    }),
    signal: ac.signal,
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.msgType === "success") {
        console.log(data);
        window.location.href = redirectURL;
      }
    })
    .catch((err) => {
      console.error(err);
      spinnerEl.classList.add("d-none");
      submitEl.classList.remove("d-none");
    });

  setTimeout(() => {
    ac.abort();
    spinnerEl.classList.add("d-none");
    submitEl.classList.remove("d-none");
  }, 8000);
}

function getApiEndpoint() {
  let endpoint = "https://api.usd21.org/glc/subscribe";

  if (
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost"
  ) {
    endpoint = "http://localhost:4000/glc/subscribe";
  }

  return endpoint;
}

function validate() {
  document.querySelectorAll(".is-invalid").forEach(item => item.classList.remove("is-invalid"));

  const isValidPhone = iti.isValidNumber();
  if (!isValidPhone) {
    phone.classList.add("is-invalid");
    customScrollTo("#phone_container");
    return false;
  }

  const firstNameVal = document.querySelector("#firstname").value;
  if (!firstNameVal) {
    firstname.classList.add("is-invalid");
    customScrollTo("#firstname_container");
    return false;
  }

  const lastNameVal = document.querySelector("#lastname").value;
  if (!lastNameVal) {
    lastname.classList.add("is-invalid");
    customScrollTo("#lastname_container");
    return false;
  }

  const cat_nextevent = document.querySelector("#cat_nextevent");
  const cat_announcements = document.querySelector("#cat_announcements");
  const nextevent = cat_nextevent.checked ? true : false;
  const announcements = cat_announcements.checked ? true : false;
  if (!nextevent && !announcements) {
    cat_nextevent.classList.add("is-invalid");
    cat_announcements.classList.add("is-invalid");
    customScrollTo("#category_container");
    return false;
  }

  const gender = document.querySelector("input[name=gender]:checked")?.value;
  if (!gender) {
    document.querySelector("#gender_male").classList.add("is-invalid");
    document.querySelector("#gender_female").classList.add("is-invalid");
    customScrollTo("#gender_container");
    return false;
  }

  return true;
}

function addEventListeners() {
  document
    .querySelector("#glcnotifications")
    .addEventListener("submit", onSubmit);
}

function init() {
  initTelInput();
  addEventListeners();
}

init();