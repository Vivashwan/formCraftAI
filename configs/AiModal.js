const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

// Server-only key (this module is imported only by server actions now).
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  // gemini-1.5-flash and 2.0-flash are not available for this API key;
  // gemini-2.5-flash is the current supported model (verified against the key).
  model: "gemini-2.5-flash",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

export const AiChatSession = model.startChat({
  generationConfig,
  // safetySettings: Adjust safety settings
  history:[]
});
