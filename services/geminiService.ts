import { GoogleGenAI } from "@google/genai";

// Fallback commentary based on score
const getFallbackCommentary = (score: number): string => {
  if (score > 500) return "Wow! You're on fire! 🔥 Keep pushing those limits!";
  if (score > 300) return "Not bad at all! You're getting the hang of this! 💪";
  if (score > 150) return "Decent run! A bit more practice and you'll be unstoppable! 😎";
  if (score > 50) return "Getting warmer... Keep trying! 😅";
  return "Game Over! Better luck next time! 🎮";
};

export const generateGameCommentary = async (score: number, depth: number, deathReason: string): Promise<string> => {
  try {
    // Check if API key is valid
    const apiKey = process.env.API_KEY;

    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY' || apiKey === 'undefined') {
      // No valid API key, use fallback
      return getFallbackCommentary(score);
    }

    // Initialize client with valid API key
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      The user just finished a game of "Down the Stairs".
      Stats: Score ${score}, Depth ${depth}m, Death by ${deathReason}.
      Provide a witty, sarcastic commentary (max 2 sentences, use emojis).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || getFallbackCommentary(score);
  } catch (error) {
    console.warn("Gemini API unavailable, using fallback commentary");
    return getFallbackCommentary(score);
  }
};