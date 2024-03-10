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

    const endpoint = `${getApiHost()}/refresh-token`;

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
    case "api.usd21.org":
      host = "https://api.usd21.org/glc";
      break;
    default:
      host = `${window.location.protocol}//${window.location.host}/glc`;
      break;
  }

  return host;
}

function showToast(
  message = "",
  headText = "GLC Admin",
  delay = "4000",
  bgClass = "bg-success"
) {
  return new Promise((resolve, reject) => {
    const toastEl = document.querySelector("#liveToast");
    const messageTextEl = toastEl.querySelector(".toast-body");
    const headEl = toastEl.querySelector(".toast-header");
    const headTextEl = headEl.querySelector("strong");
    const toast = new bootstrap.Toast(toastEl);

    [
      "bg-primary",
      "bg-secondary",
      "bg-success",
      "bg-danger",
      "bg-warning",
      "bg-info",
      "bg-dark",
    ].forEach((item) => {
      headEl.classList.remove(item);
    });
    headEl.classList.add(bgClass);

    headTextEl.innerText = headText;
    messageTextEl.innerText = message;

    toast.show();

    if (delay > 0) {
      setTimeout(() => {
        toast.hide();
        return resolve();
      }, delay);
    } else {
      return resolve();
    }
  });
}
