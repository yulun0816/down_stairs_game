# AI Down Stairs Game

這是一個使用 React + Vite + Gemini API 製作的下樓梯小遊戲。

## 如何在本機執行 (開發模式)

1. 安裝 Node.js (建議 v18 以上)。
2. 在終端機執行：
   ```bash
   npm install
   npm run dev
   ```
3. 打開瀏覽器看到的網址 (通常是 http://localhost:5173)。

## 如何發布到 GitHub Pages (自動化版)

1. 將此專案上傳到 GitHub。
2. 確保專案中有 `.github/workflows/deploy.yml` 這個檔案。
3. 上傳後，GitHub Actions 會自動開始打包 (點擊 GitHub 上方的 Actions 分頁查看進度)。
4. 等待 Actions 變成綠色勾勾 ✅。
5. 前往 GitHub Repository 的 **Settings** -> **Pages**。
6. 在 **Build and deployment** 區塊，Source 選擇 **Deploy from a branch**，Branch 選擇 **gh-pages** (如果沒有這個分支，請稍等一下 Actions 跑完)。
7. 儲存後，上方會出現您的遊戲網址。

### 關於 API Key
如果需要 AI 講評功能，請在 GitHub 的 **Settings** -> **Secrets and variables** -> **Actions** 中，新增一個 Repository secret：
- Name: `VITE_API_KEY`
- Value: `您的_GOOGLE_GEMINI_API_KEY`
