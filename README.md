# Muizo

## YouTube 播放清單解析

播放清單預覽由後端的 `POST /api/playlists/preview` 處理。前端透過 `VITE_API_URL` 連線；本機 Docker 開發環境指向 `http://localhost:8080` 的 Spring API。

請在 `muizo-api/.env` 與 `muizo-realtime/.env` 設定後端金鑰：

```dotenv
YOUTUBE_API_KEY=your_api_key
```

若 realtime 已設定金鑰，可將相同設定同步到 API。金鑰不要放進 `VITE_*`，也不要提交實際的 `.env`。

修改後，在專案根目錄重新建立受影響的容器，讓新環境變數生效。例如只修改 API 時：

```powershell
docker compose -f compose.dev.yml up -d --no-deps --force-recreate api
```

`docker compose restart` 不會重新載入 `.env`。正式環境請在 API 與 realtime 的服務環境變數設定相同名稱，再重新部署。

新金鑰可在 [Google Cloud Console](https://console.cloud.google.com/) 建立，需啟用 YouTube Data API v3，並將 API 限制設為 YouTube Data API v3。後端金鑰使用伺服器的限制方式，不使用瀏覽器來源網域限制。參考 [Google 官方設定文件](https://developers.google.com/youtube/registering_an_application)。
