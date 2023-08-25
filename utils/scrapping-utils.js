const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const fetchLyrics = url => axios.get(url).then(response => response.data);
const extractData = selector => html =>
  cheerio.load(html)(selector).text().trim();
const extractLyrics = html =>
  cheerio
    .load(html)(".lyric-original p")
    .map(function () {
      return cheerio.load(html)(this).html().replace(/<br>/g, "\n").trim();
    })
    .get()
    .join("\n");
const buildResult = html => ({
  artista: extractData(".head-subtitle a span")(html),
  titulo: extractData(".head-title")(html),
  letra: extractLyrics(html),
});
const getLyricsFromURL = url => fetchLyrics(url).then(buildResult);
const getArtistLinks = url =>
  axios.get(url).then(response => {
    const html = response.data;
    const $ = cheerio.load(html);
    return $("a[href^='/charly-garcia/']")
      .map(function () {
        return $(this).attr("href");
      })
      .get()
      .filter(href => !href.endsWith(".html") && href !== "/charly-garcia/");
  });

const saveSongToFile = song => {
  const filePath = path.join(__dirname, "songs.json");
  fs.readFile(filePath, { encoding: "utf-8" }, (err, data) => {
    if (err && err.code !== "ENOENT") {
      console.error("Ha ocurrido un error al leer el archivo:", err);
      return;
    }
    const songs = data ? JSON.parse(data) : [];
    songs.push(song);
    fs.writeFile(filePath, JSON.stringify(songs, null, 2), err => {
      if (err) {
        console.error("Ha ocurrido un error al guardar el archivo:", err);
        return;
      }
      console.log("La canción ha sido guardada correctamente.");
    });
  });
};

module.exports = { getLyricsFromURL, getArtistLinks, saveSongToFile };
