function nextSession() {
  const el = document.querySelector(".nextsession");
  if (!el) return;

  const contentEl = document.createElement("div");
  contentEl.setAttribute("id", "nextSessionContent");
  contentEl.setAttribute("align", "center");
  contentEl.innerHTML = `Coming soon!`;
  el.append(contentEl);

}

function init() {
  nextSession();
}

init();