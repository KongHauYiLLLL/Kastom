import { GoogleGenAI, Type } from "@google/genai";
import { GenerationResponse } from "../types";

const apiKey = process.env.API_KEY;

// Initialize GenAI client
// We create a new instance per call in the component to ensure latest key if needed, 
// but for this singleton service, we assume env var is stable.
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

const MODEL_NAME = 'gemini-2.5-flash';

const SYSTEM_INSTRUCTION = `
You are an expert frontend engineer and UI designer. Your task is to generate functional, beautiful, and self-contained web widgets based on user prompts.

Rules:
1.  **Output Structure**: Return a JSON object containing 'html', 'css', 'js', and a short 'title'.
2.  **Aesthetics**: Use modern, clean design. Prefer dark mode compatibility. Use system fonts.
3.  **Responsiveness**: The widget must be fully responsive. It will be displayed in a resizable container (default 320x320px).
    - **CRITICAL**: The container size is dynamic. Do NOT use fixed pixel widths/heights (like 300px) for the main wrapper.
    - **CRITICAL**: Use \`width: 100%\` and \`height: 100%\` for the root element so it fills the available space provided by the iframe.
    - **Centering**: Ensure the main content is centered vertically and horizontally using Flexbox or Grid unless the specific widget type (like a list) requires top alignment.
4.  **Layout**: Start with \`body { margin: 0; padding: 0; display: flex; flex-direction: column; height: 100vh; width: 100vw; overflow: hidden; background: transparent; box-sizing: border-box; }\`.
5.  **Isolation**: Do NOT include <html>, <head>, or <body> tags. Just the content inside body.
6.  **Functionality**: The JS should be vanilla JavaScript. It will run inside a sandboxed iframe.
7.  **Robustness**: Ensure the JS handles errors gracefully.
8.  **No External Deps**: Do not use external CDN links for CSS frameworks or JS libraries unless absolutely necessary (e.g., a specific chart lib), but prefer vanilla implementations for speed and offline usage.
9.  **Icons**: You may use SVG icons directly in the HTML.
`;

export const generateWidgetCode = async (prompt: string): Promise<GenerationResponse> => {
  if (!apiKey) {
    throw new Error("API_KEY is missing from environment variables.");
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A short title for the widget (max 20 chars)" },
            html: { type: Type.STRING, description: "The HTML structure of the widget body" },
            css: { type: Type.STRING, description: "The CSS styles (excluding <style> tags)" },
            js: { type: Type.STRING, description: "The JavaScript logic (excluding <script> tags)" },
          },
          required: ["title", "html", "css", "js"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No content generated");
    }

    return JSON.parse(text) as GenerationResponse;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};