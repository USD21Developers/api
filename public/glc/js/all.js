function nextSession() {
  const el = document.querySelector("#nextsession");
  if (!el) return;

  const upcomingEventsHTML = `&lt; No upcoming events. &gt;`;

  el.innerHTML = upcomingEventsHTML;
}

function init() {
  nextSession();
}

init();