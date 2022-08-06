function getApiHost() {
  let host;

  switch (window.location.hostname) {
    case "glc.usd21.org":
      host = "https://api.usd21.org/glc";
      break;
    default:
      host = `http://${window.location.host}/glc`;
      break;
  }

  return host;
}

function validateToken() {
  const hasToken = window.location.hash.length >= 2;
  const token = hasToken ? window.location.hash.split("#")[1] : "";
  const endpoint = `${getApiHost()}/confirm`;

  if (!token.length) return;

  fetch(endpoint, {
    mode: "cors",
    method: "POST",
    body: JSON.stringify({
      token: token
    }),
    headers: new Headers({
      "Content-Type": "application/json",
      authorization: `Bearer ${token}`
    })
  })
    .then(res => res.json())
    .then(data => {
      switch (data.msg) {
        case "token is required":
          break;
        case "invalid token":
          break;
        case "unable to query for token":
          break;
        case "token not found":
          break;
        case "token expired":
          break;
        case "unable to update token record":
          break;
        case "token confirmed":
          const spinnerEl = document.querySelector("#spinner");
          const confirmingEl = document.querySelector("#confirming");
          const confirmedEl = document.querySelector("#confirmed");
          const confirmedText = "Confirmed!";
          spinnerEl.classList.add("d-none");
          confirmedEl.classList.remove("d-none");
          confirmingEl.querySelector("h2").innerText = confirmedText;
          document.title = confirmedText;
          break;
      }
    })
}

function init() {
  validateToken();
}

init();