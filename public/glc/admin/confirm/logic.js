function validateHash() {
  const hasHash = window.location.hash.length >= 2;
  const hash = hasHash ? window.location.hash.split("#")[1] : "";

  if (!hash.length) return;

  console.log(hash);
}

function init() {
  validateHash();
}

init();