# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

這是一個使用 React + Vite + TypeScript 製作的下樓梯(Down Stairs)小遊戲。玩家控制一個角色向下移動通過不同類型的平台,避免傷害並累積分數。遊戲整合了 Google Gemini AI 用於遊戲結束時的評論功能,以及排行榜系統。

## 常用指令

### 開發指令
```bash
npm install          # 安裝依賴
npm run dev          # 啟動開發伺服器 (Vite, 通常在 http://localhost:5173)
npm run build        # 建置生產版本到 dist/ 目錄
npm run preview      # 預覽生產建置
```

### 部署指令
```bash
npm run predeploy    # 執行建置 (自動在 deploy 前執行)
npm run deploy       # 部署到 GitHub Pages (使用 gh-pages)
```

## 專案架構

### 核心檔案結構

```
ai-down-stairs/
├── App.tsx                    # 主應用元件,管理遊戲狀態、UI 和事件處理
├── index.tsx                  # React 應用入口
├── components/
│   └── GameCanvas.tsx         # 遊戲核心邏輯和 Canvas 渲染
├── services/
│   ├── audioService.ts        # Web Audio API 音效系統 (無需外部資產)
│   ├── geminiService.ts       # Google Gemini AI 整合
│   └── leaderboardService.ts  # 排行榜 API 整合 (Google Apps Script)
├── types.ts                   # TypeScript 類型定義
├── constants.ts               # 遊戲常數 (物理參數、顏色等)
└── vite.config.ts             # Vite 配置
```

### 架構概覽

#### 1. 遊戲狀態管理 (App.tsx)
- **GameState**: START → PLAYING → GAME_OVER
- 管理分數、HP、玩家名稱、排行榜狀態
- 處理鍵盤和觸控輸入事件
- 協調遊戲結束流程:生成 AI 評論並自動提交分數

#### 2. 遊戲引擎 (GameCanvas.tsx)
- 使用 `requestAnimationFrame` 實現遊戲循環
- **物理系統**: 重力、碰撞檢測、平台互動
- **實體管理**: 玩家、平台、粒子效果、背景星星
- **難度系統**: 平台速度隨時間遞增,特殊平台出現機率提升
- **平台類型**:
  - NORMAL: 標準平台,提供緩慢治療
  - SPIKE: 造成傷害的尖刺平台
  - CONVEYOR: 左/右傳送帶
  - TRAMPOLINE: 彈跳平台
  - FRAGILE: 踩踏後消失的易碎平台

#### 3. 服務層

**audioService.ts**
- 使用 Web Audio API 程序式生成 8-bit 風格音效
- 無需外部音頻資產檔案
- 支援: 跳躍、著陸、受傷、彈跳、遊戲結束音效及背景音樂

**geminiService.ts**
- 使用 `@google/genai` SDK
- API 金鑰從環境變數讀取: `process.env.API_KEY` (在建置時對應到 `import.meta.env.VITE_API_KEY`)
- 遊戲結束時生成諷刺性評論

**leaderboardService.ts**
- 與 Google Apps Script Web App 整合
- 需要環境變數 `VITE_LEADERBOARD_URL`
- 使用 `Content-Type: text/plain` 避免 CORS 預檢請求
- 自動儲存玩家名稱到 localStorage (`ADS_PLAYER_NAME`)

### 環境變數

在本地開發時建立 `.env` 檔案:
```
VITE_API_KEY=your_google_gemini_api_key
VITE_LEADERBOARD_URL=your_google_apps_script_url
```

在 GitHub Actions 部署時,需在 Repository Settings → Secrets 中設定:
- `VITE_API_KEY` (必要,用於 AI 評論功能)
- `VITE_LEADERBOARD_URL` (選用,用於排行榜)

### 重要技術細節

1. **Vite 配置**: `base: './'` 確保靜態資源在 GitHub Pages 上正確載入
2. **環境變數映射**: `process.env.API_KEY` 在建置時被替換為 `import.meta.env.VITE_API_KEY`
3. **觸控控制**: 使用 Pointer Events 支援行動裝置,將畫布分為左右兩區
4. **響應式設計**: 使用 `dvh` 單位和 Tailwind CSS 的 responsive utilities
5. **自動提交分數**: 如果 localStorage 中存在玩家名稱,遊戲結束時自動提交分數

### 樣式系統

- 使用 Tailwind CSS (配置在 postcss.config.js)
- 設計風格: 賽博龐克/霓虹風格
- 動畫: 使用 Tailwind 的 `animate-*` utilities 和自定義 CSS 動畫

### 部署流程

GitHub Actions workflow (`.github/workflows/deploy.yml`):
1. 在任何分支 push 時觸發
2. 安裝依賴並建置 (注入環境變數)
3. 將 `dist/` 目錄部署到 `gh-pages` 分支

## 常見開發情境

### 修改遊戲物理參數
編輯 [constants.ts](constants.ts) 中的值 (例如 `GRAVITY`, `JUMP_FORCE`, `PLAYER_SPEED`)

### 新增平台類型
1. 在 [types.ts](types.ts) 的 `PlatformType` enum 中新增類型
2. 在 [GameCanvas.tsx](components/GameCanvas.tsx) 的 `generatePlatform` 函式中新增生成邏輯
3. 在 `update` 函式的碰撞處理中新增行為邏輯
4. 在 `draw` 函式中新增視覺渲染
5. 在 [constants.ts](constants.ts) 中新增顏色定義

### 調整難度曲線
修改 [constants.ts](constants.ts) 中的:
- `PLATFORM_SPEED_INCREASE`: 控制速度增長率
- `PLATFORM_GAP_MIN` / `PLATFORM_GAP_MAX`: 控制平台間距
- [GameCanvas.tsx](components/GameCanvas.tsx) `generatePlatform` 函式中的機率計算

### 修改 AI 評論風格
編輯 [geminiService.ts](services/geminiService.ts) 中的 prompt 內容
