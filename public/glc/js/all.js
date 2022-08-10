function nextSession() {
  const el = document.querySelector(".nextsession");
  if (!el) return;

  const head = document.querySelector("head");
  const linkTag = document.createElement("link");
  linkTag.setAttribute("rel", "stylesheet");
  linkTag.setAttribute("href", "https://api.usd21.org/glc/css/nextsession.css");
  head.append(linkTag);

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