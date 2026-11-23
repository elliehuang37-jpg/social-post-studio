# 三平台圖文工作室

填一份稿單，用 AI 同時產出 Facebook、Instagram、Threads 三平台的圖卡與貼文文案。

- 三種圖卡風格（大字主視覺／重點清單卡／照片疊字），依平台切換尺寸，改字即時重繪
- 字數、hashtag 上限與美妝／保健合規用語提醒
- 複製文案、下載 PNG；手機上可「分享到 App」直接帶圖到 IG／Threads／FB
- AI：在 claude.ai Artifact 內使用檢視者的 Claude 帳戶；安裝成 PWA 時使用自己的 Anthropic API 金鑰（只存在本機）。沒有 AI 也能用內建範本

## 開發

```
node scripts/serve.js 5280      # 本機預覽
node scripts/make-icons.js      # 重新產生圖示
node scripts/stamp-sw.js        # 改完網頁後更新離線快取版本
node scripts/build-artifact.js  # 產生 Claude Artifact 版（dist/artifact.html）
```
