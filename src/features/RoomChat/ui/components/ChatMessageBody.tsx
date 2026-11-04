import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";

export default function ChatMessageBody({ content }: { content: string }) {
  // Only turn the app's existing public collection links into actionable previews.
  const parts = content.split(/(https?:\/\/[^\s<>]+)/g);
  return <div className="floating-chat-msg-body">{parts.map((part, index) => {
    if (/^https?:\/\//.test(part)) {
      try {
        const url = new URL(part);
        const id = url.searchParams.get("sharedCollection");
        if (url.origin === window.location.origin && url.pathname === "/rooms" && id && /^[a-zA-Z0-9-]+$/.test(id)) {
          const href = `/rooms?sharedCollection=${encodeURIComponent(id)}`;
          return <a key={index} className="chat-shared-collection" href={href} target="_blank" rel="noopener noreferrer">
            <LibraryMusicRoundedIcon fontSize="small" />
            <span><strong>查看分享題庫</strong><small>開啟題庫介紹與歌曲清單</small></span>
            <ArrowOutwardRoundedIcon fontSize="small" />
          </a>;
        }
      } catch { /* Keep malformed links as plain message text. */ }
    }
    return part;
  })}</div>;
}
