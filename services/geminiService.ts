import { GoogleGenAI } from "@google/genai";

// Fallback commentary based on score
const getFallbackCommentary = (score: number): string => {
  if (score > 500) return "哇!你太強了! 🔥 繼續突破極限!";
  if (score > 300) return "還不錯!你越來越上手了! 💪";
  if (score > 150) return "不錯的成績!再練習一下就無敵了! 😎";
  if (score > 50) return "有點意思...繼續加油! 😅";
  return "遊戲結束!下次再接再厲! 🎮";
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
      玩家剛完成一局「下樓梯」遊戲。
      數據: 分數 ${score}, 深度 ${depth}公尺, 死因: ${deathReason}。
      請提供風趣、諷刺的評論(最多2句話,使用表情符號),並使用繁體中文回答。
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