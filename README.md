# 多 AI 協作平台｜公開互動展示版

這是正式「多 AI 協作平台」的匿名化作品展示。頁面保留產品定位、九種協作模式、代理路由、證據與記憶、SSE 串流交付、測試與安全設計，並以純前端模擬提供可操作的多 AI 決策流程。

## 為什麼是展示版

正式平台會連接 OpenAI、Anthropic、Claude Code SDK、Codex CLI 與本機 SQLite，資料庫中也有真實研究紀錄。公開版本刻意不包含：

- API Key、OAuth Token 或正式環境變數
- SQLite 資料庫、私人對話或客戶資料
- 可執行本機 CLI、Git 或檔案系統操作的後端能力
- 未經驗證的商業成果宣稱

## 展示內容

- 九種協作模式：直接詢問、圓桌討論、正反辯論、提案評審、分工研究、創意工作坊、專案經理、使用者模擬、策略決策
- 可切換模式與輸入問題的互動模擬器
- Claude／GPT／USER_SIM 三角色輸出與協作結論
- 正式平台架構、技術堆疊與工程證據
- 響應式行動版、鍵盤操作與 reduced-motion 支援

## 本機預覽

直接用瀏覽器開啟 `index.html`，或以任意靜態檔案伺服器提供此目錄。

## 正式專案技術

Next.js 16、React 19、TypeScript、Prisma 7、SQLite、Zod、SSE、Playwright、OpenAI API、Anthropic API、Claude Code SDK、Codex CLI。

## 資料安全

本目錄只含靜態 HTML、CSS 與 JavaScript。所有互動內容為匿名化模擬資料，不會將輸入送往伺服器或第三方服務。
