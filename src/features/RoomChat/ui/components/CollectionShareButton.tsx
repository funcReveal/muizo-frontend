import { useState } from "react";
import type { RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { Popover } from "@mui/material";
import LibraryMusicRoundedIcon from "@mui/icons-material/LibraryMusicRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { useAuth } from "@shared/auth/AuthContext";
import { ensureFreshAuthToken } from "@shared/auth/token";
import { collectionsApi } from "@features/Collections/shared/api/collectionsApi";

type ShareableCollection = {
  id: string;
  title: string;
  visibility: string;
  lifecycle_status?: string;
  moderation_status?: string;
  deleted_at?: string | null;
  item_count?: number;
};

type Props = {
  disabled: boolean;
  messageInput: string;
  setMessageInput: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  maxLength: number;
};

export default function CollectionShareButton({ disabled, messageInput, setMessageInput, inputRef, maxLength }: Props) {
  const { authUser, authToken, refreshAuthToken } = useAuth();
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const open = Boolean(anchor && !disabled && authUser?.id);
  const query = useQuery({
    queryKey: ["chat-share-collections", authUser?.id],
    enabled: open,
    staleTime: 0,
    queryFn: async (): Promise<ShareableCollection[]> => {
      const token = await ensureFreshAuthToken({ token: authToken, refreshAuthToken });
      if (!token || !authUser?.id) throw new Error("請重新登入後再試");
      return collectionsApi.fetchCollections(token, authUser.id);
    },
  });
  const collections = (query.data ?? []).filter((item) =>
    item.visibility === "public" &&
    (!item.lifecycle_status || item.lifecycle_status === "published") &&
    (!item.moderation_status || item.moderation_status === "normal") &&
    !item.deleted_at,
  );
  const filtered = collections.filter((item) => item.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const select = (item: ShareableCollection) => {
    const url = new URL("/rooms", window.location.origin);
    url.searchParams.set("sharedCollection", item.id);
    const share = `推薦我的題庫「${item.title}」 ${url.toString()}`;
    const next = messageInput.trim() ? `${messageInput.trim()} ${share}` : share;
    if (next.length > maxLength) {
      setError(`加入分享後超過 ${maxLength} 字，請先縮短訊息`);
      return;
    }
    setMessageInput(next);
    setAnchor(null);
    window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  };

  return <>
    <button
      type="button"
      className="chat-collection-share-trigger"
      aria-label="分享我的題庫"
      title="分享我的題庫"
      aria-haspopup="dialog"
      aria-expanded={open}
      disabled={disabled || !authUser?.id}
      onClick={(event) => { setSearch(""); setError(null); setAnchor(event.currentTarget); }}
    ><LibraryMusicRoundedIcon fontSize="small" /></button>
    <Popover
      open={open}
      anchorEl={anchor}
      onClose={() => setAnchor(null)}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      transformOrigin={{ vertical: "bottom", horizontal: "right" }}
      marginThreshold={12}
      slotProps={{ paper: { className: "chat-collection-picker", role: "dialog", "aria-label": "分享我的題庫" } }}
    >
      <div className="chat-collection-picker__header">
        <div><strong>分享我的題庫</strong><p>選擇已公開的作品，和大家一起猜歌。</p></div>
        <button type="button" aria-label="關閉題庫選單" onClick={() => setAnchor(null)}><CloseRoundedIcon fontSize="small" /></button>
      </div>
      <label className="chat-collection-picker__search">
        <SearchRoundedIcon fontSize="small" />
        <input autoFocus aria-label="搜尋我的題庫" placeholder="搜尋題庫名稱" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      <div className="chat-collection-picker__list" aria-busy={query.isFetching}>
        {query.isPending ? <p className="chat-collection-picker__status" role="status">正在載入你的題庫…</p>
          : query.isError ? <div className="chat-collection-picker__status" role="alert"><p>{query.error.message || "題庫載入失敗"}</p><button type="button" onClick={() => void query.refetch()}>重新載入</button></div>
          : filtered.length ? filtered.map((item) => <button type="button" className="chat-collection-picker__item" key={item.id} disabled={query.isFetching} onClick={() => select(item)}>
            <span className="chat-collection-picker__icon"><LibraryMusicRoundedIcon fontSize="small" /></span>
            <span><strong>{item.title}</strong><small>公開題庫{typeof item.item_count === "number" ? ` · ${item.item_count} 題` : ""}</small></span>
            <ArrowForwardRoundedIcon fontSize="small" />
          </button>)
          : <div className="chat-collection-picker__status" role="status">
            {collections.length > 0 && search.trim() ? <><p>找不到符合的題庫，試試其他名稱。</p><button type="button" onClick={() => setSearch("")}>清除搜尋</button></>
              : <><p>{query.data?.length ? "目前沒有可分享的公開題庫，完成並公開作品後就能分享。" : "還沒有建立題庫，從你喜歡的歌曲開始吧。"}</p><a href={query.data?.length ? "/collections" : "/collections/new"} target="_blank" rel="noopener noreferrer">{query.data?.length ? "管理我的題庫 ↗" : "建立第一份題庫 ↗"}</a></>}
          </div>}
      </div>
      {error ? <p className="chat-collection-picker__error" role="alert">{error}</p> : null}
      <div className="chat-collection-picker__footer">選取後加入輸入框，按送出即可分享。</div>
    </Popover>
  </>;
}
