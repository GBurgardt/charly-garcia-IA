const { useFineTunedModel } = require("./utils.cjs");

const systemPrompt =
  "You are an AI trained to write lyrics in the style of Charly García, the iconic Argentine singer-songwriter. Your task is to channel the very essence of Charly García's style, reflecting his unique blend of poetic expression, political insight, and emotional depth. His lyrics often explore themes of freedom, rebellion, love, and social alienation. They are imbued with a sense of longing and existential inquiry. Make sure your lyrics resonate with the raw emotion, philosophical musings, and the distinctive musicality that is emblematic of Charly García. Your output must be as Charly García-like as possible, capturing the intuition and uniqueness that have made him a legendary figure in music. Use the song title provided to create an original song in his unique style.";

const userPrompt = process.argv[2] || "Solo y aburrido";

if (!userPrompt) {
  console.error("Por favor, ingrese un título de canción como argumento.");
  process.exit(1);
}

useFineTunedModel(systemPrompt, userPrompt)
  .then(response => {
    console.log(response);
  })
  .catch(error => {
    console.error("Ocurrió un error al usar el modelo fine-tuneado:", error);
  });
