# AI 決策管理儀表板

這個專案依照需求完成「前端 + 後端」版本，使用 Node.js、Express、React、Vite、Recharts 與 Supabase 串接。LSTM 模型尚未實作，但後端已預留 `forecasts`、`model_runs` 等資料表接口，未來可直接把模型輸出寫入 Supabase 後由介面顯示。

## 需要的介面與功能分析

### 1. 決策管理總覽儀表板（Global Decision Dashboard）
管理者登入後首頁，目標是在 10 秒內掌握全局。

- 核心指標看板：今日預計銷量、本月銷量達成率、異動警示數。
- 自動化進貨預警：列出庫存不足 / 過剩商品、可用庫存、7 日需求、建議進貨量。
- 趨勢快照：顯示全站 14 天歷史銷量與未來預測曲線。
- 異動警示中心：集中顯示庫存與模型狀態提醒。

### 2. 銷量預測分析中心（Sales Forecasting Center）
把資料庫預測結果視覺化，未來可替換成 LSTM 輸出。

- 長短期趨勢圖：支援 14 / 21 / 30 天視圖，呈現歷史銷量、AI 預測值、置信區間上下緣。
- 產品篩選：可查看全站或單一產品。
- 多維度特徵權重視圖：顯示氣候、節慶、週末、促銷、價格等因素貢獻度。
- 非線性變動追蹤：列出促銷、節慶、天氣等造成突發波動的事件。

### 3. 科學化進貨與庫存決策（Scientific Stock Control）
把預測資料轉成可執行的採購決策。

- 智慧訂單建議：依預測需求、安全庫存、現有庫存計算建議訂購量。
- 一鍵產生採購單：送出到 `/api/stock-control/purchase-orders`，成功時會寫入 Supabase `purchase_orders` 表；若資料表不存在或權限不足會回傳錯誤。
- 模擬情境分析：可調整促銷狀態、價格變動百分比，即時顯示情境預測。
- 穩定性報告：顯示置信區間寬度、波動分數、備貨建議。

### 4. 資料特徵監控介面（Data Feature Monitor）
確保輸入資料與模型運行狀態正常。

- 外部因子監控站：氣溫、降雨機率、節慶行事曆、促銷排程。
- 模型運行健康度：紅綠燈顯示模型狀態、最後執行時間、Adam 優化器與權重更新狀態。

## 專案結構

- `server/index.js`：Express API、Supabase 讀取、分析邏輯、採購單建立接口。
- `src/main.jsx`：React 單頁管理介面。
- `src/styles.css`：儀表板樣式與響應式設計。
- `.env.example`：Supabase 與 API 設定範例。

## 安裝與啟動

1. 安裝套件

```bash
npm install
```

2. 建立 `.env`

```bash
cp .env.example .env
```

3. 啟動前後端

```bash
npm run dev
```

- 前端：`http://localhost:5173`
- 後端：`http://localhost:4000/api`

## Supabase 資料表建議

完整建表與測試資料 SQL 已放在 `supabase/schema_seed.sql`，可以直接複製到 Supabase SQL Editor 執行。此 SQL 會建立資料表並匯入 demo 資料；注意它會先清空相關資料表。

目前後端只會讀取 Supabase 資料，不會在後端寫死任何展示資料。若資料表不存在，API 會回傳 Supabase 錯誤；若資料表存在但沒有資料，前端會顯示空狀態。

### `products`

| 欄位 | 說明 |
| --- | --- |
| `id` | 商品 ID |
| `name` | 商品名稱 |
| `category` | 分類 |
| `price` | 售價 |
| `safety_stock` | 安全庫存 |
| `lead_time_days` | 交期天數 |

### `inventory`

| 欄位 | 說明 |
| --- | --- |
| `product_id` | 商品 ID |
| `on_hand` | 現有庫存 |
| `reserved` | 已保留 / 已承諾量 |
| `incoming` | 已下單未到貨量 |

### `sales`

| 欄位 | 說明 |
| --- | --- |
| `product_id` | 商品 ID |
| `sale_date` | 銷售日期 |
| `quantity` | 銷售數量 |
| `revenue` | 營收 |

### `forecasts`

| 欄位 | 說明 |
| --- | --- |
| `product_id` | 商品 ID |
| `forecast_date` | 預測日期 |
| `predicted_sales` | 預測銷量 |
| `lower_bound` | 置信區間下緣 |
| `upper_bound` | 置信區間上緣 |

### `feature_weights`

| 欄位 | 說明 |
| --- | --- |
| `product_id` | 商品 ID，可依產品篩選 |
| `feature_name` | 特徵名稱 |
| `contribution` | 特徵貢獻度 |
| `direction` | 影響方向 |

### `nonlinear_events`

| 欄位 | 說明 |
| --- | --- |
| `product_id` | 商品 ID，可依產品篩選 |
| `product_name` | 商品名稱 |
| `event_date` | 事件日期 |
| `event_type` | 事件類型 |
| `impact` | 影響幅度 |
| `response` | 系統反應說明 |

### `weather_features`

| 欄位 | 說明 |
| --- | --- |
| `region` | 區域 |
| `temperature` | 氣溫 |
| `rainfall_probability` | 降雨機率 |
| `observed_at` | 觀測時間 |

### `promotions`

| 欄位 | 說明 |
| --- | --- |
| `name` | 活動名稱 |
| `status` | 狀態 |
| `start_date` | 開始日期 |
| `end_date` | 結束日期 |

### `holidays`

| 欄位 | 說明 |
| --- | --- |
| `date` | 日期 |
| `name` | 節慶或特殊日名稱 |
| `expected_impact` | 預估影響 |

### `model_runs`

| 欄位 | 說明 |
| --- | --- |
| `status` | `success` / `completed` / `healthy` 代表正常 |
| `optimizer` | 例如 `Adam` |
| `weight_updated` | 權重是否更新完成 |
| `created_at` | 執行時間 |

### `purchase_orders`

| 欄位 | 說明 |
| --- | --- |
| `status` | 採購單狀態 |
| `items` | JSON 採購明細 |
| `created_at` | 建立時間 |

## 目前未包含

- LSTM 模型訓練與推論程式。
- 使用者登入 / 權限控管。
- 真實外部天氣 API 與節慶 API 同步排程。

後續只要把 LSTM 預測結果寫入 `forecasts`，前端圖表與庫存建議就會直接使用 Supabase 的實際資料。
