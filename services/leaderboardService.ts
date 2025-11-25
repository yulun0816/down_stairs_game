
import { LeaderboardEntry } from '../types';

// Access Vite environment variable directly
// @ts-ignore - Vite injects import.meta.env at build time
const GOOGLE_SCRIPT_URL = import.meta.env.VITE_LEADERBOARD_URL || '';

export const submitScore = async (name: string, score: number, depth: number): Promise<boolean> => {
  if (!GOOGLE_SCRIPT_URL) {
    console.warn("Leaderboard unavailable: VITE_LEADERBOARD_URL not set");
    return false;
  }

  try {
    // We use content-type text/plain to avoid CORS preflight options request issues
    // with simple Google Apps Script web apps.
    // The script should parse JSON.parse(e.postData.contents).
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ name, score, depth }),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error("Failed to submit score:", error);
    return false;
  }
};

export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  if (!GOOGLE_SCRIPT_URL) return [];

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL);
    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();
    return data as LeaderboardEntry[];
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return [];
  }
};
