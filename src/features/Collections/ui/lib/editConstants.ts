export const TEXT = {
  notSet: "(未設定)",
  createTitle: "建立收藏庫",
  backRooms: "返回收藏庫",
  collectionName: "收藏庫名稱",
  collectionNamePlaceholder: "例如：我的 K-POP 收藏",
  playlistLabel: "YouTube 播放清單",
  loadPlaylist: "載入清單",
  loading: "載入中...",
  playlistErrorInvalid: "請貼上有效的 YouTube 播放清單網址",
  playlistErrorApi: "尚未設定 API 位置 (API_URL)",
  playlistErrorLoad: "讀取播放清單失敗，請稍後重試",
  playlistErrorEmpty: "清單沒有可用影片，請確認播放清單是否公開",
  playlistErrorGeneric: "讀取播放清單時發生錯誤",
  playlistCount: "清單歌曲：",
  songsUnit: " 首",
  noThumb: "無縮圖",
  noSelection: "尚未選擇歌曲",
  selectSong: "請先選擇歌曲",
  editTime: "剪輯時間",
  start: "開始",
  end: "結束",
  startSec: "開始秒數",
  endSec: "結束秒數",
  answer: "答案",
  answerPlaceholder: "輸入本題答案",
  listTodo: "收藏庫列表（待實作）",
} as const;

export const START_TIME_LABEL = "開始時間 (mm:ss)";
export const END_TIME_LABEL = "結束時間 (mm:ss)";
export const ANSWER_MAX_LENGTH = 80;
export const PLAY_LABEL = "播放";
export const PAUSE_LABEL = "暫停";
export const VOLUME_LABEL = "音量";
export const DUPLICATE_SONG_ERROR = "曲目已存在";
export const CLIP_DURATION_LABEL = "播放時長";
export const SAVING_LABEL = "儲存中";
export const SAVE_ERROR_LABEL = "儲存失敗";
export const SAVED_LABEL = "已儲存";
export const UNSAVED_PROMPT = "尚未儲存，確定要離開嗎？";
export const COLLECTION_SELECT_LABEL = "收藏庫清單";
export const NEW_COLLECTION_LABEL = "建立新收藏庫";
export const EDIT_VOLUME_STORAGE_KEY = "mq_edit_volume";
export const LEGACY_VOLUME_STORAGE_KEY = "mq_volume";
export const EDIT_MUTE_STORAGE_KEY = "mq_edit_muted";
export const EDIT_AUTOPLAY_STORAGE_KEY = "mq_edit_autoplay";
export const EDIT_LOOP_STORAGE_KEY = "mq_edit_loop";
export const LEGACY_ID_KEY = "video" + "_id";
