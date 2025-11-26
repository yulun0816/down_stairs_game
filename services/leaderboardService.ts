
import { LeaderboardEntry, UserData, SyncResponse } from '../types';

// Safely access environment variable with optional chaining to prevent runtime crashes
const getLeaderboardUrl = () => {
  try {
    // @ts-ignore
    return import.meta?.env?.VITE_LEADERBOARD_URL || 'https://script.google.com/macros/s/AKfycbyMPWWEOL0KU2l3mQ5cs5Tax-XzJO-aOEfG2rPi5eHgaAFGhk8enwbvpHhSnK9UaOE5/exec';
  } catch {
    return '';
  }
};

const GOOGLE_SCRIPT_URL = getLeaderboardUrl();

/**
 * Log in a user by name.
 * Returns their saved coins, skins, and high score from the cloud.
 */
export const loginUser = async (name: string): Promise<UserData | null> => {
  if (!GOOGLE_SCRIPT_URL) return null;

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'login', name }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });
    const data = await response.json();
    return data as UserData;
  } catch (error) {
    console.error("登入失敗:", error);
    return null;
  }
};

/**
 * Sync all user data (Score, Depth, Coins, Skins) to the cloud.
 */
export const syncUserData = async (
  name: string, 
  score: number, 
  depth: number, 
  coins: number, 
  skins: string[]
): Promise<boolean> => {
  if (!GOOGLE_SCRIPT_URL) return false;

  try {
    await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'sync', 
        name, 
        score, 
        depth, 
        coins, 
        skins 
      }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });
    return true;
  } catch (error) {
    console.error("同步失敗:", error);
    return false;
  }
};

/**
 * Submit score to leaderboard (legacy function for basic score submission)
 */
export const submitScore = async (name: string, score: number, depth: number): Promise<boolean> => {
  if (!GOOGLE_SCRIPT_URL) {
    console.warn("排行榜無法使用: 未設定 VITE_LEADERBOARD_URL");
    return false;
  }

  try {
    // Use simple POST for backward compatibility with existing leaderboard
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ name, score, depth }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error("提交分數失敗:", error);
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
    console.error("獲取排行榜失敗:", error);
    return [];
  }
};
