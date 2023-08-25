const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");

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

const convertToFineTuningFormat = () => {
  const filePath = path.join(__dirname, "songs.json");
  fs.readFile(filePath, { encoding: "utf-8" }, (err, data) => {
    if (err) {
      console.error("Ha ocurrido un error al leer el archivo:", err);
      return;
    }

    const songs = JSON.parse(data);
    const systemContent = `You are an AI trained to write lyrics in the style of Charly García, the iconic Argentine singer-songwriter. Your task is to channel the very essence of Charly García's style, reflecting his unique blend of poetic expression, political insight, and emotional depth. His lyrics often explore themes of freedom, rebellion, love, and social alienation. They are imbued with a sense of longing and existential inquiry. Make sure your lyrics resonate with the raw emotion, philosophical musings, and the distinctive musicality that is emblematic of Charly García. Your output must be as Charly García-like as possible, capturing the intuition and uniqueness that have made him a legendary figure in music. Use the song title provided to create an original song in his unique style.`;

    const fineTuningData = songs.map(song => ({
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: song.titulo },
        { role: "assistant", content: song.letra },
      ],
    }));

    const outputFilePath = path.join(__dirname, "fine_tuning_data.jsonl");
    const jsonlContent = fineTuningData
      .map(record => JSON.stringify(record))
      .join("\n");

    fs.writeFile(outputFilePath, jsonlContent, err => {
      if (err) {
        console.error("Ha ocurrido un error al guardar el archivo:", err);
        return;
      }
      console.log(
        "El archivo de fine tuning ha sido guardado correctamente en formato JSONL."
      );
    });
  });
};

const uploadFineTuningDataset = () => {
  const filePath = path.join(__dirname, "fine_tuning_data.jsonl");

  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.error("Ha ocurrido un error al leer el archivo:", err);
      return;
    }

    const formData = new FormData();
    formData.append("purpose", "fine-tune");
    formData.append("file", data, "fine_tuning_data.jsonl"); // Cambiado para usar un Blob

    axios
      .post("https://api.openai.com/v1/files", formData, {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      })
      .then(response => {
        console.log(
          "El archivo de fine tuning ha sido subido correctamente:",
          response.data
        );
      })
      .catch(error => {
        console.error("Ha ocurrido un error al subir el archivo:", error);
      });
  });
};

const startFineTuningJob = (fileId, modelName) => {
  axios
    .post(
      "https://api.openai.com/v1/fine_tuning/jobs",
      {
        training_file: fileId, // La ID del archivo que acabas de subir
        model: modelName, // El nombre del modelo base que quieres usar, como "gpt-3.5-turbo"
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    )
    .then(response => {
      console.log(
        "El trabajo de fine tuning ha sido iniciado correctamente:",
        response.data
      );
    })
    .catch(error => {
      console.error(
        "Ha ocurrido un error al iniciar el trabajo de fine tuning:",
        error
      );
    });
};

const getFineTuningSummary = () => {
  axios
    .get("https://api.openai.com/v1/fine_tuning/jobs", {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    })
    .then(response => {
      const jobs = response.data.data;

      console.log("Resumen de trabajos de fine tuning:");
      console.log("===================================");

      // Encabezados de la tabla
      console.log(
        "ID".padEnd(30) +
          "| " +
          "Modelo".padEnd(18) +
          "| " +
          "Estado".padEnd(10) +
          "| " +
          "Tokens Entrenados".padEnd(18) +
          "| " +
          "Fecha Creación"
      );

      // Línea divisoria
      console.log(
        "-".repeat(30) +
          "|" +
          "-".repeat(19) +
          "|" +
          "-".repeat(11) +
          "|" +
          "-".repeat(19) +
          "|" +
          "-".repeat(18)
      );

      // Iterar sobre los trabajos y mostrar los detalles en la tabla
      jobs.forEach(job => {
        const id = job.id.padEnd(30);
        const model = job.model.padEnd(18);
        const status = job.status.padEnd(10);
        const trainedTokens = (job.trained_tokens || "N/A")
          .toString()
          .padEnd(18);
        const createdAt = new Date(job.created_at * 1000).toLocaleString();

        console.log(
          `${id}| ${model}| ${status}| ${trainedTokens}| ${createdAt}`
        );
      });
    })
    .catch(error => {
      console.error(
        "Error al obtener el resumen de trabajos de fine tuning:",
        error
      );
    });
};

async function useFineTunedModel(systemPrompt, userPrompt) {
  const fineTunedModel = `ft:gpt-3.5-turbo-0613:personal::7rEp7GSv`;

  const payload = {
    model: fineTunedModel,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  };

  const config = {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
  };

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      payload,
      config
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    throw error;
  }
}

module.exports = {
  getLyricsFromURL,
  getArtistLinks,
  saveSongToFile,
  convertToFineTuningFormat,
  uploadFineTuningDataset,
  startFineTuningJob,
  getFineTuningSummary,
  useFineTunedModel,
};
