function nextSession() {
  const el = document.querySelector("#nextsession");
  if (!el) return;

  el.parentElement.setAttribute("id", "realnextsession");

  const upcomingEventsHTML = `<div align="center">
  Coming soon!
  </div>`;

  const realEl = document.querySelector("#realnextsession");

  realEl.innerHTML = upcomingEventsHTML;

  realEl.previousElementSibling.style.marginBottom = "15px";
}

function init() {
  nextSession();
}

init();