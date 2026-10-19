let currentMarker;
let currentWeather = null;
let searchRequestId = 0;

const searchBar = document.getElementById("searchBar");
const searchForm = document.getElementById("searchForm");
const searchStatus = document.getElementById("searchStatus");
const favButton = document.getElementById("favButton");

// Leaflet map.
const map = L.map("map").setView([15.56035, 32.533157], 6);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// Use OpenStreetMap to find coordinates for the searched city.
async function searchLocation(city) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(city)}&limit=1`,
  );
  if (!response.ok) {
    throw new Error("Location search failed. Please try again.");
  }
  const results = await response.json();
  if (results.length === 0) {
    throw new Error("Location not found. Try another city name.");
  }
  return results[0];
}

// popup information
function createWeatherPopup(data, city) {
  const popup = document.createElement("section");
  popup.className = "weather-popup";
  const heading = document.createElement("h2");
  popup.appendChild(heading);
  heading.textContent = data.name || city;
  const condition = data.weather?.[0];
  const description =
    condition?.description || condition?.main || "Unavailable";
  const details = [
    ["Temperature", `${data.main.temp}°C`],
    ["Weather", description],
    ["Cloud coverage", formatMeasurement(data.clouds?.all, "%")],
    ["Humidity", formatMeasurement(data.main.humidity, "%")],
    ["Wind speed", formatMeasurement(data.wind?.speed, " m/s")],
  ];

  // add a list to put the popup details inside
  const list = document.createElement("dl");
  for (const [label, value] of details) {
    const term = document.createElement("dt");
    term.textContent = label;
    const definition = document.createElement("dd");
    definition.textContent = value;
    list.append(term, definition);
  }
  popup.appendChild(list);

  if (/^\d{2}[dn]$/.test(condition?.icon)) {
    const icon = document.createElement("img");
    icon.src = `https://openweathermap.org/img/wn/${condition.icon}@2x.png`;
    icon.alt = description;
    icon.width = 100;
    icon.height = 100;
    popup.appendChild(icon);
  }
  return popup;
}

function formatMeasurement(value, unit) {
  return Number.isFinite(value) ? `${value}${unit}` : "Unavailable";
}

// Expose network and error states to the stylesheet.
function showSearchStatus(message, state = "") {
  searchStatus.textContent = message;
  searchStatus.dataset.state = state;
  searchStatus.setAttribute("role", state === "error" ? "alert" : "status");
  searchForm.setAttribute("aria-busy", String(state === "loading"));
}
async function searchWeather() {  const requestId = ++searchRequestId;
  const city = searchBar.value.trim();
  if (!city) {
    showSearchStatus("Enter a city name to search.", "error");
    searchBar.focus();
    return;
  }
  showSearchStatus("Searching for location…", "loading");
  let searchedMarker;
  try {
    const location = await searchLocation(city);
    if (requestId !== searchRequestId) return;
    const latitude = Number(location.lat);
    const longitude = Number(location.lon);
    map.stop();
    map.flyTo([latitude, longitude], 9, { duration: 1.2 });
    searchedMarker = L.marker([latitude, longitude]).addTo(map);
    currentMarker = searchedMarker;
    searchedMarker.bindPopup("Loading weather…").openPopup();
    showSearchStatus("Loading weather…", "loading");

    const response = await fetch(
      `http://127.0.0.1:3000/api/weather?lat=${latitude}&lon=${longitude}`,
    );
    const data = await response.json();
    if (requestId !== searchRequestId) return;
    if (!response.ok || !Number.isFinite(data.main?.temp)) {
      throw new Error("Weather request failed. Please search again.");
    }

    searchedMarker.setPopupContent(createWeatherPopup(data, city)).openPopup();
    currentWeather = { ...data, name: data.name || city };
    showSearchStatus("");
  } catch (error) {
    if (requestId !== searchRequestId) return;
    const message =
      error instanceof TypeError
        ? "Could not connect. Check your connection and weather server, then search again."
        : error.message;

    if (searchedMarker) {
      const errorCard = document.createElement("p");
      errorCard.className = "error-card";
      errorCard.setAttribute("role", "alert");
      errorCard.textContent = message;
      searchedMarker.setPopupContent(errorCard).openPopup();
      showSearchStatus("");
    } else {
      showSearchStatus(message, "error");
    }
  }
}
function formatWeather(data) {
  return `Weather in ${data.name}: ${data.main.temp}°C`;
}
function getWeatherText() {
  if (!currentWeather) {
    showSearchStatus("Search for a city first.", "error");
    return null;
  }

  return formatWeather(currentWeather);
}


///////////////////////////
////favourtie features/////
///////////////////////////
function favLocation() {
  const city = searchBar.value.trim();
  if (!city) {
    localStorage.removeItem('favourites')
    console.log("cleared\n"+localStorage.getItem('favourites'))
    showSearchStatus("Enter a city name to favourite.", "error");
    searchBar.focus();
    return;
  }
  let favourites = JSON.parse(localStorage.getItem("favourites")) || [];
  if (!favourites.includes(city)) {
    favourites.push(city);
    localStorage.setItem('favourites', JSON.stringify(favourites));
    showFav()
    showSearchStatus("Added to favourites", "success");
  } else {
  showSearchStatus("Item is already in favourites.", "error")
    console.log(localStorage.getItem('favourites'))
  }
}
function showFav() {
  const favList = document.getElementById("favList");
  const favourites = JSON.parse(localStorage.getItem("favourites")) || [];
  favList.replaceChildren();

  if (favourites.length === 0) {
    favList.textContent = "favourtied: none";
  } else {
    favList.append("favourtied: ");
    favourites.forEach((city) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "fav-city";
      button.textContent = city;
      button.addEventListener("click", () => {
        searchBar.value = city;
        searchWeather();
      });
      favList.appendChild(button);
    });
  }
}



///////////////////////////
//////Share features///////
///////////////////////////


function showShareModal(){

}

async function shareWeather(userChoice, weatherFormattedText = getWeatherText()) {
  if (weatherFormattedText === null){
    searchStatus("Search for a city first", "error")
    return;
  }
  try {
    switch (userChoice) {
      case "copy": {
        if (!navigator.clipboard?.writeText) {
          showSearchStatus("Clipboard copying is unavailable.", "error");
          return;
        }

        await navigator.clipboard.writeText(weatherFormattedText);
        showSearchStatus("Weather copied!", "success");
        break;
      }

      case "whatsapp": {
        const whatsappUrl =
          `https://wa.me/?text=${encodeURIComponent(weatherFormattedText)}`;

        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
        break;
      }

      case "twitter": {
        const twitterUrl = new URL("https://twitter.com/intent/tweet");
        twitterUrl.searchParams.set("text", weatherFormattedText);

        window.open(twitterUrl.href, "_blank", "noopener,noreferrer");
        break;
      }

      default:
        showSearchStatus("Choose a sharing option.", "error");
    }
  } catch (error) {
    console.error("Sharing failed:", error);
    showSearchStatus("Could not share or copy the weather.", "error");
  }
}

var shareButton = document.getElementById("shareModalButton");
var modal = document.getElementById("myModal");
var span = document.getElementsByClassName("close")[0];
var whatsappButton = document.getElementById("WhatsApp")
var xButton= document.getElementById("X")
var clipboardButton= document.getElementById("Clipboard")


shareButton.addEventListener("click", () => {
  if (getWeatherText() === null) return;
  modal.style.display = "block";
});
span.addEventListener("click", () => {
  modal.style.display = "none";
});
window.addEventListener("click", (event) => {
  if (event.target === modal) {
    modal.style.display = "none";
  }
});
xButton.addEventListener("click", () => {
  shareWeather("twitter");
});
whatsappButton.addEventListener("click", () => {
  shareWeather("whatsapp");
});
clipboardButton.addEventListener("click", () => {
  shareWeather("copy");
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  searchWeather();
});
favButton.addEventListener("click", (event) => {
  event.preventDefault();
  favLocation();
});
showFav()
