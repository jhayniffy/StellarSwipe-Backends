import { registerAs } from "@nestjs/config";

export const xaiConfig = registerAs("xai", () => ({
  apiKey: process.env.XAI_API_KEY,
  model: process.env.XAI_MODEL || "grok-2-1212",
  apiUrl: "https://api.x.ai/v1/chat/completions",
}));
