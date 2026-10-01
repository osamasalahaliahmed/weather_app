/// use openstreetmap to get city coords by using the city name from search bar
async function searchLocation(city) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(city)}&limit=1`
  );

  if (!response.ok) {
    throw new Error("Location search failed");
  }

  const results = await response.json();

  if (results.length === 0) {
    throw new Error("Location not found");
  }

  return results[0];
}
let currentMarker;
let longitude=0
let latitude = 0
var marker
// get location name from search result
const searchBar = document.getElementById('searchBar');
const searchButton = document.getElementById('searchButton')
searchButton.addEventListener('click', async () => {
const searchData = searchBar.value.trim();
  console.log("searchData = " + searchData);

// use location name to get lat and lon
const location = await searchLocation(searchData);
latitude = Number(location.lat);
longitude = Number(location.lon);
map.flyTo([latitude, longitude], 12);
  if (currentMarker)
    map.removeLayer(currentMarker);
currentMarker = L.marker([latitude, longitude]).addTo(map);
})




// leaflet map
var map = L.map('map').setView([15.56035, 32.533157], 6);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);


function onMapClick(e) {
  if (currentMarker) {
    map.removeLayer(currentMarker);
  }
  currentMarker = L.marker(e.latlng).addTo(map);
}
map.on('click', onMapClick);
