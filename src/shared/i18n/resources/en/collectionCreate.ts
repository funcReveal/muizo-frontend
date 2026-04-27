const collectionCreate = {
  page: {
    title: "Create Collection",
    description:
      "Import a YouTube playlist, review the playable items, then publish it as a collection.",
    loginRequired: "Please sign in with Google before creating a collection.",
  },

  steps: {
    source: {
      label: "Source",
      description: "Import playlist",
    },
    review: {
      label: "Review",
      description: "Check items",
    },
    publish: {
      label: "Publish",
      description: "Finalize settings",
    },
  },

  source: {
    title: "Choose Source",
    description:
      "Import a YouTube playlist by URL or select one from your Google account.",
    urlTab: "Playlist URL",
    youtubeTab: "My YouTube playlists",
    playlistUrlLabel: "YouTube playlist URL",
    playlistUrlPlaceholder: "https://www.youtube.com/playlist?list=...",
    playlistUrlHint:
      "Paste a playlist URL. will automatically analyze available items and remove duplicates when possible.",
    invalidPlaylistUrl:
      "Please paste a valid YouTube playlist URL that contains a list parameter.",
    loading: "Loading...",
    googleLoginHint:
      "Sign in with Google to load your YouTube playlists directly.",
    googleLogin: "Sign in with Google",
    playlistSelectPlaceholder: "Select a YouTube playlist",
    playlistSelectLoading: "Loading playlists...",
    playlistOption: "{{title}} ({{count}} items)",
    playlistOptionUnknownCount: "{{title}}",
    playlistLoadingHint: "Loading your playlists...",
    importingYoutube: "Importing YouTube playlist...",
    importFailed: "Import failed. Please try again later.",
    selectPlaylistFirst: "Please select a YouTube playlist first.",
    clearPlaylistUrl: "Clear playlist URL",
    reselectPlaylist: "Reselect playlist",
    clearPlaylistDialogTitle: "Reselect playlist?",
    clearPlaylistDialogDescription:
      "The current parsed playlist and import result will be cleared. You can paste or select another playlist afterward.",
    clearPlaylistDialogCancel: "Cancel",
    clearPlaylistDialogConfirm: "Clear and reselect",
    playlistLockedHint:
      "The playlist has been parsed. To change it, click the X button and choose another playlist.",
  },

  review: {
    title: "Review Import Result",
    description:
      "Check playable items, long tracks, duplicates, and skipped videos before publishing.",
    playableItems: "{{count}} playable items",
    itemLimitHint: "Each collection can include up to {{limit}} questions.",
    itemLimitUnlimited: "Each collection can include unlimited questions.",
    summary: {
      ready: "Ready",
      long: "Long",
      duplicates: "Duplicates",
      skipped: "Skipped",
    },
    alerts: {
      duplicatesRemoved: "Duplicates removed",
      duplicatesRemovedDetail: "{{count}} items · View details",
      itemLimitExceeded: "Item limit exceeded",
      itemLimitExceededDetail: "Remove {{count}} more items",
      skippedItems: "Skipped items",
      skippedItemsDetail: "{{count}} items · View details",
      cleanResult:
        "Import result looks clean. You can continue to publish settings.",
    },
    filters: {
      all: "All",
      ready: "Ready",
      long: "Long",
      issues: "Issues",
    },
    searchPlaceholder: "Search title or uploader",
    issuesHint:
      "Issues are grouped above. Use skipped items, duplicates removed, or item limit exceeded to view details and resolve them.",
    emptyFilter: "No items match the current filter.",
    empty: "Import a playlist first. The review result will appear here.",
    importing: {
      urlTitle: "Importing playlist",
      youtubeTitle: "Importing YouTube playlist",
      fallback: "Preparing import...",
      hint: "The review list will update automatically after import.",
    },
  },

  publish: {
    title: "Publish Collection",
    description:
      "Confirm the final settings before creating this playable collection.",
    readyBadge: "Ready to create",
    attentionBadge: "Needs attention",

    details: {
      title: "Collection details",
      nameLabel: "Collection name",
      namePlaceholder: "Enter collection name",
      nameRequired: "Collection name is required.",
      descriptionLabel: "Description",
      descriptionPlaceholder:
        "Describe what this collection is about, who it is for, or what kind of songs it contains.",
      descriptionCounter: "{{count}}/500",
    },

    visibility: {
      title: "Visibility",
      publicTitle: "Public collection",
      privateTitle: "Private collection",
      publicDescription: "Other players can browse and use this collection.",
      privateDescription: "Only you can view and use this collection.",
      privateLimit: "You can create up to {{count}} private collections.",
    },

    checklist: {
      title: "Readiness checklist",
      titleReady: "Collection name is set.",
      titleMissing: "Collection name is required before creating.",
      itemsReady: "{{count}} playable items are ready.",
      itemsMissing: "At least one playable item is required.",
      withinLimit: "Item count is within the allowed limit.",
      limitExceeded: "Item limit exceeded. Remove {{count}} more items.",
      quotaAvailable: "Collection quota is available.",
      quotaReached:
        "Collection limit reached. Please remove an existing collection first.",
      skippedWarning: "{{count}} skipped items will not be imported.",
      longWarning:
        "{{count}} long tracks are included. They can still be used, but may need review later.",
    },

    summary: {
      title: "Final summary",
      ready: "Ready",
      longTracks: "Long tracks",
      skipped: "Skipped",
      duplicatesRemoved: "Duplicates removed",
    },
  },

  inspector: {
    importSummary: "Import Summary",
    totalItems: "Total items",
    readyItems: "Ready items",
    longTracks: "Long tracks",
    duplicatesRemoved: "Duplicates removed",
    skippedItems: "Skipped items",
    itemLimit: "Item limit: {{current}} / {{limit}}",
    overflow: "Remove {{count}} more items before creating this collection.",

    publishReadiness: "Publish Readiness",
    visibility: "Visibility",
    public: "Public",
    private: "Private",
    collections: "Collections",
    privateCollections: "Private collections",
    collectionSlots: "Collection slots",
    privateSlots: "Private slots",
    collectionLimitReached:
      "Collection limit reached. Please remove an existing collection first.",
    privateLimitReached:
      "Private collection limit reached. You can only create public collections now.",
  },

  actionBar: {
    createCollection: "Create Collection",
    creating: "Creating...",
  },

  dialogs: {
    duplicateTitle: "Automatically removed duplicate songs",
    duplicateDescription:
      "{{count}} duplicate items were automatically removed and will not block creation.",
    issueTitle: "Skipped item reasons",
    issueDescription: "{{count}} items could not be imported.",
  },
};

export default collectionCreate;
