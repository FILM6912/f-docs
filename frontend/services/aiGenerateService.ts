import { GoogleGenAI } from "@google/genai";

type AiProvider = "gemini" | "openai" | "anthropic";

interface AiConfig {
  provider: AiProvider;
  geminiApiKey: string;
  geminiModel: string;
  openaiApiKey: string;
  openaiModel: string;
  openaiBaseUrl: string;
  anthropicApiKey: string;
  anthropicModel: string;
  anthropicBaseUrl: string;
}

const STORAGE_KEY = "ai-settings";

const getEnv = (key: string): string => {
  try {
    const viteValue = (import.meta as any)?.env?.[key];
    if (typeof viteValue === "string" && viteValue.trim()) {
      return viteValue.trim();
    }
  } catch {
    // ignore
  }

  try {
    // @ts-ignore
    const processValue = typeof process !== "undefined" ? process?.env?.[key] : "";
    if (typeof processValue === "string" && processValue.trim()) {
      return processValue.trim();
    }
  } catch {
    // ignore
  }

  return "";
};

const getStoredSettings = (): Partial<AiConfig> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return {};
};

const getProvider = (): AiProvider => {
  const stored = getStoredSettings();
  if (stored.provider) {
    return stored.provider as AiProvider;
  }
  const raw = (getEnv("VITE_AI_PROVIDER") || getEnv("AI_PROVIDER") || "gemini").toLowerCase();
  if (raw === "openai" || raw === "anthropic" || raw === "gemini") {
    return raw;
  }
  return "gemini";
};

const getPrompt = (schemaDescription: string) => `
You are an expert API tester.
Generate a valid JSON object based strictly on the following schema or description.
Populate it with realistic, creative dummy data for a "Cosmos Store" (futuristic tech shop).
Do NOT include markdown formatting (like \`\`\`json). Just return the raw JSON string.

Schema/Description:
${schemaDescription}
`;

const cleanJsonText = (text: string): string =>
  text.replace(/```json/g, "").replace(/```/g, "").trim();

const generateWithGemini = async (prompt: string): Promise<string> => {
  const stored = getStoredSettings();
  const apiKey = stored.geminiApiKey || getEnv("VITE_GEMINI_API_KEY") || getEnv("GEMINI_API_KEY") || getEnv("API_KEY");
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please configure it in Settings.");
  }

  const model = stored.geminiModel || getEnv("VITE_GEMINI_MODEL") || getEnv("GEMINI_MODEL") || "gemini-2.5-flash";
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return cleanJsonText(response.text || "{}");
};

const generateWithOpenAI = async (prompt: string): Promise<string> => {
  const stored = getStoredSettings();
  const apiKey = stored.openaiApiKey || getEnv("VITE_OPENAI_API_KEY") || getEnv("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OpenAI API key is missing. Please configure it in Settings.");
  }

  const model = stored.openaiModel || getEnv("VITE_OPENAI_MODEL") || getEnv("OPENAI_MODEL") || "gpt-4o-mini";
  const baseUrl = stored.openaiBaseUrl || getEnv("VITE_OPENAI_BASE_URL") || getEnv("OPENAI_BASE_URL") || "https://api.openai.com/v1";
  const endpoint = baseUrl.endsWith("/chat/completions") 
    ? baseUrl 
    : `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You generate strict JSON payloads only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${details}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  return cleanJsonText(typeof text === "string" ? text : "{}");
};

const generateWithAnthropic = async (prompt: string): Promise<string> => {
  const stored = getStoredSettings();
  const apiKey = stored.anthropicApiKey || getEnv("VITE_ANTHROPIC_API_KEY") || getEnv("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("Anthropic API key is missing. Please configure it in Settings.");
  }

  const model = stored.anthropicModel || getEnv("VITE_ANTHROPIC_MODEL") || getEnv("ANTHROPIC_MODEL") || "claude-3-5-sonnet-latest";
  const baseUrl = stored.anthropicBaseUrl || getEnv("VITE_ANTHROPIC_BASE_URL") || getEnv("ANTHROPIC_BASE_URL") || "https://api.anthropic.com";
  const endpoint = baseUrl.endsWith("/v1/messages") 
    ? baseUrl 
    : `${baseUrl.replace(/\/$/, "")}/v1/messages`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
      system: "You generate strict JSON payloads only.",
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Anthropic request failed (${response.status}): ${details}`);
  }

  const data = await response.json();
  const text = data?.content?.find((item: any) => item?.type === "text")?.text;
  return cleanJsonText(typeof text === "string" ? text : "{}");
};

export const generateMockPayload = async (schemaDescription: string): Promise<string> => {
  const provider = getProvider();
  const prompt = getPrompt(schemaDescription);

  try {
    if (provider === "openai") {
      return await generateWithOpenAI(prompt);
    }

    if (provider === "anthropic") {
      return await generateWithAnthropic(prompt);
    }

    return await generateWithGemini(prompt);
  } catch (error) {
    console.error(`AI payload generation failed (provider: ${provider}):`, error);
    return `{
  "error": "Failed to generate payload via ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}"
}`;
  }
};

export const getCurrentProvider = (): AiProvider => getProvider();

export const hasApiKey = (): boolean => {
  const provider = getProvider();
  const stored = getStoredSettings();
  
  switch (provider) {
    case "openai":
      return !!(stored.openaiApiKey || getEnv("VITE_OPENAI_API_KEY") || getEnv("OPENAI_API_KEY"));
    case "anthropic":
      return !!(stored.anthropicApiKey || getEnv("VITE_ANTHROPIC_API_KEY") || getEnv("ANTHROPIC_API_KEY"));
    case "gemini":
    default:
      return !!(stored.geminiApiKey || getEnv("VITE_GEMINI_API_KEY") || getEnv("GEMINI_API_KEY") || getEnv("API_KEY"));
  }
};
