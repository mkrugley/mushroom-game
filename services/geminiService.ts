import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateGoombaWisdom = async (score: number, causeOfDeath: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        You are a sentient Goomba from an 8-bit video game.
        The player just played "Revenge of the Goomba" and scored ${score}.
        They died by: ${causeOfDeath}.

        Generate a short, funny, philosophical, or roasting quote (max 20 words) for the Game Over screen.
        Speak in a retro-villain or minions-style voice.
        Do not use quotes around the output.
      `,
      config: {
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    return response.text || "Game Over. The plumber always wins...";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Game Over. Connection to the Mushroom Kingdom lost.";
  }
};
