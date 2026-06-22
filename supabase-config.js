// ── Supabase 連線設定 ──────────────────────────────────
// 到 Supabase 後台 → Project Settings → Data API（或 API）
//   1) Project URL        → 填到 url
//   2) Project API Keys 的 anon / public key → 填到 anonKey
// anon key 設計上就是公開的，靠資料表的 RLS 政策保護，放在前端是安全的。
window.SUPABASE_CONFIG = {
  url: "在此貼上你的 Project URL",
  anonKey: "在此貼上你的 anon public key"
};
