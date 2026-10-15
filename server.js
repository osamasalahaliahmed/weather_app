const http = require("node:http");
const { readFile } = require("node:fs");
const path = require("node:path");
try {
  process.loadEnvFile(path.join(__dirname, ".env"));
} catch (error) {
  // An environment variable can also be supplied directly by the terminal.
  if (error.code !== "ENOENT") throw error;
}
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const publicFiles = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/script.js": ["script.js", "text/javascript; charset=utf-8"],
  "/styles.css": ["styles.css", "text/css; charset=utf-8"],
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:3000");
  if (url.pathname !== "/api/weather") {
    const file = Object.hasOwn(publicFiles, url.pathname) && publicFiles[url.pathname];
    if (!file) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    readFile(path.join(__dirname, file[0]), (error, contents) => {
      res.writeHead(error ? 500 : 200, {
        "Content-Type": error ? "text/plain; charset=utf-8" : file[1],
      });
      res.end(error ? "Could not load page" : contents);
    });
    return;
  }

  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));

  getWeather(lat, lon)
    .then((data) => {
      res.writeHead(200, {
        "Content-Type": "application/json",
      });

      res.end(JSON.stringify(data));
    })
    .catch((error) => {
      console.error(error);

      res.writeHead(500, {
        "Content-Type": "application/json",
      });

      res.end(
        JSON.stringify({
          error: "Weather request failed",
        }),
      );
    });
});

server.listen(3000, "127.0.0.1", () => {
  console.log("Server running at http://127.0.0.1:3000");
});

async function getWeather(lat, lon) {
  if (!WEATHER_API_KEY) {
    throw new Error("Set WEATHER_API_KEY in .env or your terminal, then restart the server.");
  }
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`;
  const response = await fetch(weatherUrl);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Weather request failed");
  }
  return data;
}
