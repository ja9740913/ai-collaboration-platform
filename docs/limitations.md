# 已知限制

## 公開版本刻意不包含

- 不連接 OpenAI、Anthropic、Claude Code 或 Codex。
- 不提供登入、多租戶、正式資料庫與遠端持久化。
- 不包含 SSE UI、Token／成本計量與正式觀測系統。
- 不操作本機 CLI、檔案系統、Git Worktree 或外部搜尋。
- 不使用私人對話、公司資料或客戶資料。

## Fixture 的意義

Fixture 讓成功、格式錯誤、流量受限、永久失敗與續跑路徑可以決定論地重現。它證明 Orchestrator 邏輯與測試方式，不證明模型回答品質，也不等同正式線上服務。

## 尚未驗證

- 真實模型的延遲、成本、速率限制及輸出漂移。
- 多程序同時寫入同一個 FileRunStore 的鎖定策略。
- 正式客服資料的個資治理與法規要求。
- 商業 KPI、使用者採用率與長期維運成本。

## 下一步

- 加入可替換的 Server-side Provider Adapter 與合約測試。
- 使用匿名測試集建立模型品質評估，而不是只驗證 Schema。
- 將 RunStore 換成具 Lease／Fencing Token 的正式持久層。
- 為事件軌跡加入 OpenTelemetry 或等價觀測介面。

