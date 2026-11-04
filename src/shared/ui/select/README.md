# MuizoSelect

網站共用的單選 dropdown，供篩選、設定與內容來源選擇使用。以 MUI Select 保留方向鍵導覽、文字跳選、Enter 選取、Esc 關閉與焦點回復。

```tsx
import { MuizoSelect } from "@shared/ui/select";

<MuizoSelect<"all" | "waiting">
  label="狀態"
  ariaLabel="房間狀態"
  placeholder="選擇狀態"
  size="compact"
  value={status}
  options={[
    { value: "all", label: "全部狀態" },
    { value: "waiting", label: "等待中" },
  ]}
  onChange={setStatus}
/>
```

- 使用 `label` 顯示欄位名稱；沒有可見標籤時，提供 `ariaLabel`。`placeholder` 是未選取時的提示。
- 選項支援 `description`、`thumbnail`、`meta` 與 `disabled`，其中 `meta` 適合顯示筆數等非互動資訊。純文字選項不需要縮圖設定。
- `loading` 會顯示載入狀態並禁止變更；`emptyText`、`helperText`、`errorText` 分別提供空狀態、說明及錯誤回饋。
- `size="compact"` 用於工具列；預設尺寸適合帶縮圖或說明的欄位。容器自行決定寬度，文字過長會省略。
- `name` 與 `required` 支援表單提交及必填語意。`onOpen` 可用於延後載入選項。
- 預設沿用網站琥珀色。`tone="casual"` 保留休閒模式的青綠色語意；`leaderboard` 沿用琥珀色。
- 選單透過 portal 避免被捲動容器裁切，預設層級 1700，位於 1500 的 drawer 與 1600 的內層 dialog 上方。特殊容器可在 `.muizo-select-menu` 覆寫 `--muizo-select-z-index`。
- 開合動態會遵循使用者的減少動態效果設定；開啟選單不會鎖定頁面捲動或改變頁面寬度。

大廳房間篩選、生涯紀錄、收藏庫排行及建立題庫的播放清單選擇共用此元件。行動版來源切換與 `MuizoSelectField` 目前保留各自的介面，尚未遷移。
