import { GoogleGenAI } from "@google/genai";

// Safely access process.env to avoid "process is not defined" in browser environments
const getApiKey = () => {
  try {
    // @ts-ignore
    return (typeof process !== 'undefined' && process.env && process.env.API_KEY) || '';
  } catch {
    return '';
  }
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

export const generateMockPayload = async (schemaDescription: string): Promise<string> => {
  if (!apiKey) {
    console.warn("API_KEY not found. Returning empty string.");
    return "{\n  \"error\": \"API Key missing. Cannot generate.\"\n}";
  }

  try {
    const prompt = `
    You are an expert API tester.
    Generate a valid JSON object based strictly on the following schema or description.
    Populate it with realistic, creative dummy data for a "Cosmos Store" (futuristic tech shop).
    Do NOT include markdown formatting (like \`\`\`json). Just return the raw JSON string.
    
    Schema/Description:
    ${schemaDescription}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    const text = response.text || "{}";
    // Clean up if markdown was accidentally included
    return text.replace(/```json/g, '').replace(/```/g, '').trim();

  } catch (error) {
    console.error("Gemini generation failed:", error);
    return "{\n  \"error\": \"Failed to generate payload via AI.\"\n}";
  }
};