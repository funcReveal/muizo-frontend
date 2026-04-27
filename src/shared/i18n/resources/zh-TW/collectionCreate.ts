const collectionCreate = {
  page: {
    title: "建立收藏庫",
    description:
      "匯入 YouTube 播放清單、檢查可用題目，最後發布成可開房使用的收藏庫。",
    loginRequired: "請先使用 Google 登入後再建立收藏庫。",
    backToCollections: "返回收藏列表",
  },

  steps: {
    source: {
      label: "來源",
      description: "匯入播放清單",
    },
    review: {
      label: "檢查",
      description: "確認匯入結果",
    },
    publish: {
      label: "發布",
      description: "完成建立設定",
    },
  },

  importProgress: {
    processed: "目前已處理 {{received}} / {{total}} 首",
    youtubeFallback: "正在整理 YouTube 播放清單內容...",
    urlFallback: "正在載入播放清單內容...",
  },

  creatingOverlay: {
    title: "正在建立收藏庫",
    description:
      "這一步會一次建立收藏庫並寫入歌曲資料，若中途失敗不會留下不完整的收藏庫。",
    fallbackStage: "準備中",
    pendingCount: "0/0",
  },

  source: {
    title: "選擇來源",
    description:
      "透過 YouTube 播放清單連結匯入，或從你的 Google 帳號選擇播放清單。",
    urlTab: "播放清單連結",
    youtubeTab: "我的 YouTube 清單",
    sourceSwitchDisabledHint: "播放清單解析中，請等待完成後再切換來源。",
    playlistUrlLabel: "YouTube 播放清單連結",
    playlistUrlPlaceholder: "https://www.youtube.com/playlist?list=...",
    playlistUrlHint: "貼上播放清單連結後，會自動分析可用項目，並移除重複歌曲。",
    invalidPlaylistUrl:
      "請貼上有效的 YouTube 播放清單連結，例如含有 list 參數的網址。",
    loading: "載入中...",
    googleLoginHint: "登入 Google 後可直接載入你的 YouTube 播放清單。",
    googleLogin: "登入 Google",
    playlistSelectPlaceholder: "選擇 YouTube 播放清單",
    playlistSelectLoading: "載入播放清單中...",
    playlistOption: "{{title}}（{{count}} 首）",
    playlistOptionUnknownCount: "{{title}}",
    playlistAlreadyImported: "已匯入過這份清單",
    importedBadge: "已匯入",
    playlistLoadingHint: "正在載入你的播放清單...",
    importingYoutube: "正在匯入 YouTube 播放清單...",
    importFailed: "匯入失敗，請稍後再試。",
    selectPlaylistFirst: "請先選擇 YouTube 播放清單。",
    clearPlaylistUrl: "清除播放清單連結",
    reselectPlaylist: "重新選擇播放清單",
    clearPlaylistDialogTitle: "重新選擇播放清單？",
    clearPlaylistDialogDescription:
      "目前已解析的播放清單與匯入結果會被清除，你可以重新貼上或選擇另一份清單。",
    clearPlaylistDialogCancel: "取消",
    clearPlaylistDialogConfirm: "清除並重選",
    playlistLockedHint:
      "播放清單已解析完成。若要更換清單，請點擊右側的 X 清除後重新選擇。",
    importedSourcesTitle: "已匯入來源",
    importedSourcesDescription: "{{sourceCount}} 個來源 · {{itemCount}} 首歌曲",
    importedSourcesEmpty:
      "尚未匯入來源。你可以貼上播放清單連結，或從 YouTube 清單選擇匯入。",
    importedSourceCount: "{{count}} 首",
    importedSourceSkipped: "略過 {{count}} 首",
    removeImportSource: "移除 {{title}}",
    clearAllSources: "清除全部來源",
    sourceTypeYoutubeUrl: "連結",
    sourceTypeYoutubeAccount: "YouTube",
    untitledSource: "未命名來源",
  },

  review: {
    title: "檢查匯入結果",
    description: "發布前確認可用題目、超長曲目、重複項目與未成功匯入的影片。",
    playableItems: "{{count}} 個可遊玩項目",
    itemLimitHint: "每個收藏庫最多可收錄 {{limit}} 題。",
    itemLimitUnlimited: "每個收藏庫可收錄無上限題目。",
    untitledItem: "未命名項目",
    noCover: "無封面",
    unknownUploader: "未知上傳者",
    titlePlaceholder: "輸入收藏庫名稱",
    editTitleAria: "編輯收藏庫名稱",
    clearSearch: "清除搜尋",
    sourceLabel: "來源",
    removeItem: "移除歌曲",
    restoreItem: "還原歌曲",
    removeSource: "移除此來源",
    removeSourceConfirm:
      "確定要移除「{{title}}」這個來源嗎？此來源底下的歌曲會一併從建立內容中移除。",

    summary: {
      ready: "可用",
      long: "超長",
      duplicates: "重複",
      skipped: "略過",
      removed: "已移除",
    },

    alerts: {
      duplicatesRemoved: "已移除重複項目",
      duplicatesRemovedDetail: "{{count}} 個項目 · 查看明細",
      itemLimitExceeded: "超過題目上限",
      itemLimitExceededDetail: "還需要移除 {{count}} 個項目",
      skippedItems: "未成功匯入項目",
      skippedItemsDetail: "{{count}} 個項目 · 查看明細",
      cleanResult: "匯入結果看起來正常，可以繼續設定發布內容。",
      removedItems: "已手動移除項目",
      removedItemsDetail: "{{count}} 個項目 · 查看與還原",
    },

    filters: {
      all: "全部",
      ready: "可用",
      long: "超長",
      removed: "已移除",
      issues: "問題",
    },

    display: {
      list: "列表",
      source: "依來源",
    },

    sourcePicker: {
      all: "全部來源",
    },

    sourceGroup: {
      selected: "保留 {{count}} 首",
      removed: "已移除 {{count}} 首",
      total: "共 {{count}} 首",
      skipped: "略過 {{count}} 首",
    },

    searchPlaceholder: "搜尋歌曲名稱或上傳者",
    issuesHint:
      "問題已整理在上方。請透過未成功匯入、重複項目或超過上限查看與處理明細。",
    emptyFilter: "目前篩選條件下沒有符合的項目。",
    empty: "請先匯入播放清單，匯入結果會顯示在這裡。",

    importing: {
      urlTitle: "正在匯入播放清單",
      youtubeTitle: "正在匯入 YouTube 播放清單",
      fallback: "正在準備匯入...",
      hint: "匯入完成後，檢查列表會自動更新。",
    },
  },

  issueDrawer: {
    title: "未成功匯入項目",
    description:
      "共有 {{count}} 個項目未成功匯入，這些項目不會被建立到收藏庫中。",
    close: "關閉未成功匯入項目",
    missingDetails:
      "其中 {{count}} 個項目目前沒有詳細資料，可能是後端只回傳了略過數量。",
    emptyTab: "這個分類目前沒有項目。",
    untitledItem: "未命名項目",
    videoId: "影片 ID：{{videoId}}",
    sourceTypeYoutubeUrl: "播放清單連結",
    sourceTypeYoutubeAccount: "YouTube 清單",
    tabs: {
      duplicate: "重複",
      removed: "已移除",
      private: "隱私限制",
      blocked: "嵌入限制",
      unavailable: "不可用",
      unknown: "未知",
    },
    descriptions: {
      duplicate: "這些影片與已匯入項目重複，因此被略過。",
      removed: "這些影片可能已被上傳者移除或無法再存取。",
      private: "這些影片可能是私人影片，無法被系統讀取。",
      blocked: "這些影片限制嵌入播放，可能無法正常作為題目使用。",
      unavailable: "這些影片目前不可用，可能是地區、授權或狀態限制。",
      unknown: "這些項目無法判斷具體原因，建議重新檢查播放清單。",
    },
  },

  publish: {
    title: "發布收藏庫",
    description: "建立前確認最後設定，這份收藏庫之後可以用來開房遊玩。",
    readyBadge: "可以建立",
    attentionBadge: "需要確認",

    details: {
      title: "收藏庫資訊",
      nameLabel: "收藏庫名稱",
      namePlaceholder: "輸入收藏庫名稱",
      nameRequired: "收藏庫名稱為必填。",
      descriptionLabel: "描述",
      descriptionPlaceholder:
        "描述這份收藏庫的主題、適合誰玩，或包含哪些類型的歌曲。",
      descriptionCounter: "{{count}}/500",
    },

    visibility: {
      title: "公開狀態",
      publicTitle: "公開收藏庫",
      privateTitle: "私人收藏庫",
      publicDescription: "其他玩家可以瀏覽並使用這份收藏庫。",
      privateDescription: "只有你可以查看與使用這份收藏庫。",
      privateLimit: "私人收藏最多只能建立 {{count}} 個。",
      privateLimitToast:
        "私人收藏最多只能建立 {{count}} 個，請改為公開收藏或先整理現有私人收藏。",
    },

    checklist: {
      title: "建立前檢查",
      titleReady: "收藏庫名稱已設定。",
      titleMissing: "建立前需要設定收藏庫名稱。",
      itemsReady: "已有 {{count}} 個可遊玩項目。",
      itemsMissing: "至少需要一個可遊玩項目。",
      withinLimit: "題目數量在允許範圍內。",
      limitExceeded: "已超過題目上限，還需要移除 {{count}} 個項目。",
      quotaAvailable: "收藏庫建立額度可用。",
      quotaReached: "收藏庫已達建立上限，請先整理現有收藏庫。",
      skippedWarning: "{{count}} 個未成功匯入項目不會被建立。",
      longWarning: "包含 {{count}} 個超長曲目，仍可使用，但建議之後再檢查。",
    },

    summary: {
      title: "最終摘要",
      ready: "可用",
      longTracks: "超長曲目",
      skipped: "略過",
      duplicatesRemoved: "已移除重複",
    },
  },

  inspector: {
    importSummary: "匯入摘要",
    totalItems: "總項目",
    totalImportedItems: "總匯入",
    selectedItems: "已選用",
    removedItems: "已移除",
    removedItemsHint: "已手動移除 {{count}} 首歌曲，建立時不會包含這些項目。",
    readyItems: "可用項目",
    longTracks: "超長曲目",
    duplicatesRemoved: "已移除重複",
    skippedItems: "略過項目",
    itemLimit: "題目上限：{{current}} / {{limit}}",
    overflow: "建立前還需要移除 {{count}} 個項目。",

    publishReadiness: "發布狀態",
    visibility: "公開狀態",
    public: "公開",
    private: "私人",
    collections: "收藏庫",
    privateCollections: "私人收藏",
    collectionSlots: "收藏庫額度",
    privateSlots: "私人額度",
    collectionLimitReached: "收藏庫已達建立上限，請先整理現有收藏庫。",
    privateLimitReached: "私人收藏已達上限，目前只能建立公開收藏。",
  },

  actionBar: {
    createCollection: "建立收藏庫",
    creating: "建立中...",
  },

  dialogs: {
    duplicateTitle: "已自動移除的重複歌曲",
    duplicateDescription:
      "共自動移除 {{count}} 個重複項目，建立時不會再被重複擋下。",
    issueTitle: "未成功匯入原因",
    issueDescription: "共 {{count}} 個項目未能匯入收藏庫。",
  },
};

export default collectionCreate;
