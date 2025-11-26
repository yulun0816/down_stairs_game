import { GoogleGenAI } from "@google/genai";

// 根據分數提供降級評論
const getFallbackCommentary = (score: number): string => {
  if (score > 500) return "哇!你太強了! 🔥 繼續突破極限!";
  if (score > 300) return "還不錯!你越來越上手了! 💪";
  if (score > 150) return "不錯的成績!再練習一下就無敵了! 😎";
  if (score > 50) return "有點意思...繼續加油! 😅";
  return "遊戲結束!下次再接再厲! 🎮";
};

export const generateGameCommentary = async (score: number, depth: number, deathReason: string): Promise<string> => {
  try {
    // 檢查 API Key 是否有效
    const apiKey = process.env.API_KEY;

    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY' || apiKey === 'undefined') {
      // 沒有有效的 API Key,使用降級評論
      return getFallbackCommentary(score);
    }

    // 使用有效的 API Key 初始化客戶端
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
    console.warn("Gemini API 無法使用,使用降級評論");
    return getFallbackCommentary(score);
  }
};
