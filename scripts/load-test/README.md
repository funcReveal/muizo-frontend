# Load Test Scripts

這組腳本先專注在兩條壓測線：

- `多房間`
- `多使用者`

目前不包含收藏庫壓測。

## 1. Seed Many Rooms

用途：

- 建立大量房間
- 每個房間維持一個在線 host，讓房間在後端記憶體中持續存在
- 可輸出 room manifest 給使用者 bot 腳本重用

指令：

```bash
pnpm loadtest:seed-rooms -- --server http://127.0.0.1:3000 --count 1000 --concurrency 50 --output .tmp/loadtest-rooms.json
```

常用參數：

- `--server`: backend URL
- `--count`: 房間數
- `--concurrency`: 同時建立房間的 socket 數
- `--playlistSize`: 每個房間內建歌曲數
- `--questionCount`: 房間題數
- `--maxPlayers`: 房間人數上限
- `--visibility`: `public` 或 `private`
- `--output`: 將建立成功的房間資訊寫成 JSON
- `--keepAlive=false`: 建完後不常駐
- `--durationSec`: 非常駐模式下保留多久

注意：

- 預設 `keepAlive=true`
- 因為房間是 in-memory，而且跟在線 participant 綁定，所以 host bot 斷線後房間可能被清掉

## 2. Spawn Many Users

用途：

- 讓大量 socket client 同時加入既有房間
- 可測試分散房間與熱門房兩種場景

指令：

```bash
pnpm loadtest:socket-bots -- --server http://127.0.0.1:3000 --users 500 --strategy distributed --manifest .tmp/loadtest-rooms.json
```

熱門房場景：

```bash
pnpm loadtest:socket-bots -- --server http://127.0.0.1:3000 --users 500 --strategy hotspot --hotspots 5 --manifest .tmp/loadtest-rooms.json
```

常用參數：

- `--server`: backend URL
- `--users`: bot 數量
- `--concurrency`: 同時連線數
- `--strategy`: `distributed` 或 `hotspot`
- `--hotspots`: 熱門房數量，只在 `hotspot` 模式有用
- `--manifest`: 指向 `seed-rooms` 輸出的 JSON
- `--probeEveryMs`: 定期抽樣做 `latencyProbe`
- `--keepAlive=false`: 加入後不常駐
- `--durationSec`: 非常駐模式下保留多久

若沒給 `--manifest`，腳本會直接向 server 執行 `listRooms`。

## 建議測試順序

1. 多房間基礎量測

```bash
pnpm loadtest:seed-rooms -- --count 1000 --output .tmp/loadtest-rooms.json
```

2. 更高資料量

```bash
pnpm loadtest:seed-rooms -- --count 5000 --concurrency 80 --output .tmp/loadtest-rooms.json
```

3. 分散加入

```bash
pnpm loadtest:socket-bots -- --users 500 --strategy distributed --manifest .tmp/loadtest-rooms.json
```

4. 熱門房集中

```bash
pnpm loadtest:socket-bots -- --users 500 --strategy hotspot --hotspots 5 --manifest .tmp/loadtest-rooms.json
```

## 觀察指標

後端：

- process memory
- CPU 使用率
- room list response / broadcast latency
- join latency
- event loop lag

前端：

- 房間列表載入時間
- 篩選/排序反應時間
- 列表滾動與選取是否卡頓
