function getApiPrefix() {
  let host =
    window.location.host === "localhost"
      ? "http://localhost:4000/services"
      : "https://api.usd21.org/services";
  return host;
}

function getChurches() {
  const endpoint = `${getApiPrefix()}/church-directory`;

  return new Promise((resolve, reject) => {
    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => resolve(data.churches))
      .catch((err) => reject(new Error(err)));
  });
}

function helloWorld() {
  const directory = document.querySelector("#global-church-directory");
  directory.innerHTML = "Hello World!";
}

async function showChurches() {
  const directory = document.querySelector("#global-church-directory");
  const churches = await getChurches();
  let churchesHtml = "";
  const churchLength = churches.length;
  churches.forEach((item, index) => {
    const {
      contact_image,
      church_name,
      church_URL,
      mailing_city,
      mailing_state,
      mailing_country,
      contact_name,
      contact_number,
    } = item;
    const churchName = church_URL.length
      ? `<a href="${church_URL}">${church_name}</a>`
      : church_name;
    const contactImage = contact_image.length
      ? contact_image
      : "https://www.upsidedown21.org/1.1/images/church_leaders/usd21.jpg";
    let churchHtml = `<tr>
      <td valign="top">
        <img vspace="5" width="100" src="${contactImage}" alt="Photo of ${contact_name
      .trim()
      .replaceAll(
        "&",
        "and"
      )}" onerror="this.onerror=null;this.src='https://www.upsidedown21.org/1.1/images/church_leaders/usd21.jpg';" />
      </td>
      <td valign="top">
        <strong>${churchName}</strong><br>
        ${mailing_city}, ${
      mailing_state.length ? mailing_state + "," : ""
    } ${mailing_country}<br>
        ${contact_name}<br>
        <strong>${contact_number}</strong>
      </td>
    </tr>`;
    if (index < churchLength - 1) {
      churchHtml += `<tr><td colspan="2"><hr /></td></tr>`;
    }
    churchesHtml += churchHtml;
  });
  churchesHtml = `<table cellpadding="0" cellspacing="10">${churchesHtml}</table>`;
  directory.innerHTML = churchesHtml;
}

function init() {
  showChurches();
}

init();
