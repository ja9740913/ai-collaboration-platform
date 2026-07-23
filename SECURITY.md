# Security Policy

## 公開安全原則

- Repository 不應包含 API Key、Token、Cookie、正式資料庫、私人對話或客戶資料。
- Fixture 必須是虛構或完成匿名化的資料。
- `.env`、`.env.*`、`.runs/`、Log 與 Coverage 已由 `.gitignore` 排除。
- GitHub Actions 僅使用唯讀 `contents: read` 權限，不使用 Production Secret。

## 回報問題

請勿在公開 Issue 貼出憑證、個資或可識別的內部資料。安全問題可透過 GitHub Profile 上的聯絡方式私下回報。

