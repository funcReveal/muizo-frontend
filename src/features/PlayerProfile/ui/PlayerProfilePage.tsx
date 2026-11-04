import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import LibraryMusicRounded from "@mui/icons-material/LibraryMusicRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import PlayerAvatar from "@shared/ui/playerAvatar/PlayerAvatar";
import { useAuth } from "@shared/auth/AuthContext";
import { ensureFreshAuthToken } from "@shared/auth/token";
import { fetchPublicCollections, fetchPublicPlayer, playerProfilePath, playerQueryKey, PlayerProfileError, savePublicBio } from "../model/publicPlayerApi";
import "./playerProfile.css";

export default function PlayerProfilePage() {
  const { reference = "" } = useParams();
  const { authUser, authToken, refreshAuthToken, authLoading } = useAuth();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const query = useQuery({
    queryKey: playerQueryKey(reference, authUser?.id),
    enabled: Boolean(reference) && !authLoading,
    queryFn: async ({ signal }) => {
      const token = authToken ? await ensureFreshAuthToken({ token: authToken, refreshAuthToken }) : null;
      return fetchPublicPlayer(reference, signal, token);
    },
    staleTime: 60_000,
    retry: (attempt, error) => !(error instanceof PlayerProfileError && error.status === 404) && attempt < 1,
  });
  const profile = query.data;
  const unavailable = query.error instanceof PlayerProfileError && query.error.status === 404;
  const collections = useQuery({
    queryKey: ["public-player-collections", profile?.id, page],
    enabled: Boolean(profile),
    queryFn: ({ signal }) => fetchPublicCollections(profile!.id, page, signal),
    staleTime: 60_000,
  });
  useEffect(() => {
    const oldTitle = document.title;
    document.title = profile ? `${profile.displayName}的個人頁 | Muizo` : "玩家個人頁 | Muizo";
    return () => { document.title = oldTitle; };
  }, [profile]);
  useEffect(() => {
    if (!profile || reference === profile.id) return;
    client.setQueryData(playerQueryKey(profile.id, authUser?.id), profile);
    navigate(playerProfilePath(profile.id), { replace: true });
  }, [profile, reference, client, navigate, authUser?.id]);

  async function saveBio() {
    setSaving(true); setSaveError(null); setSaveNotice(null);
    try {
      const token = await ensureFreshAuthToken({ token: authToken, refreshAuthToken });
      if (!token) throw new Error("登入已過期，請重新登入後再試");
      const updated = await savePublicBio(token, bio);
      void client.invalidateQueries({ queryKey: ["public-player"], refetchType: "none" });
      client.setQueryData(playerQueryKey(reference, authUser?.id), updated);
      client.setQueryData(playerQueryKey(updated.id), { ...updated, canEdit: false });
      setEditing(false); setSaveNotice("自我介紹已更新");
    } catch (error) { setSaveError(error instanceof Error ? error.message : "儲存失敗，請稍後再試"); }
    finally { setSaving(false); }
  }

  if (query.isPending) return <main className="public-player-page"><div className="public-player-loading" role="status">正在載入玩家資料…</div></main>;
  if (query.isError || !profile) return <main className="public-player-page"><div className="public-player-state" role={unavailable ? "status" : "alert"}><h1>{unavailable ? "找不到這位玩家" : "暫時無法查看個人頁"}</h1><p>{unavailable ? "個人頁不存在或目前無法公開查看，你可以回到大廳繼續探索。" : query.error?.message || "連線暫時有問題，請稍後再試。"}</p>{!unavailable ? <button type="button" onClick={() => void query.refetch()}>重新載入</button> : null}<Link to="/rooms">回到大廳</Link></div></main>;

  return <main className="public-player-page">
    <nav className="public-player-breadcrumb" aria-label="麵包屑"><Link to="/rooms">Muizo</Link><span>/</span><span>玩家個人頁</span></nav>
    <header className="public-player-header">
      <PlayerAvatar username={profile.displayName} avatarUrl={profile.avatarUrl} clientId={profile.id} size={88} hideRankMark />
      <div className="public-player-header__copy">
        <p className="public-player-eyebrow">玩家 / 題庫創作者</p>
        <h1>{profile.displayName}</h1>
        <p className="public-player-joined">{new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long", timeZone: "Asia/Taipei" }).format(new Date(profile.joinedAt))}加入</p>
      </div>
    </header>
    <section className="public-player-about" aria-label="自我介紹">
      {editing ? <form onSubmit={(event) => { event.preventDefault(); void saveBio(); }}>
        <label htmlFor="public-player-bio">自我介紹 <span>會顯示在你的公開個人頁與頭像簡介卡</span></label>
        <textarea id="public-player-bio" maxLength={160} rows={3} autoFocus value={bio} disabled={saving} onChange={(event) => setBio(event.target.value)} />
        <div className="public-player-bio-actions"><span>{bio.length} / 160</span><button type="button" disabled={saving} onClick={() => { setEditing(false); setSaveError(null); }}>取消</button><button type="submit" disabled={saving}>{saving ? "儲存中…" : "儲存自介"}</button></div>
        {saveError ? <p role="alert">{saveError}</p> : null}
      </form> : <><p>{profile.bio || (profile.canEdit ? "寫一句自介，讓大家認識你的音樂喜好。" : "還沒寫自我介紹，先從音樂認識彼此。")}</p>{profile.canEdit ? <button type="button" onClick={() => { setBio(profile.bio); setEditing(true); setSaveNotice(null); }}><EditRounded fontSize="inherit" />{profile.bio ? "編輯自介" : "新增自我介紹"}</button> : null}</>}
      {saveNotice ? <span role="status">{saveNotice}</span> : null}
    </section>
    <dl className="public-player-stats"><div><dt>遊玩場次</dt><dd>{profile.totalMatches.toLocaleString()}<small>場</small></dd></div><div><dt>最高連擊</dt><dd>{profile.totalMatches > 0 ? <>{profile.bestCombo.toLocaleString()}<small>題</small></> : <span aria-label="尚無連擊紀錄">—</span>}</dd></div><div><dt>公開題庫</dt><dd>{profile.publicCollectionCount.toLocaleString()}<small>份</small></dd></div></dl>
    {profile.totalMatches === 0 ? <p className="public-player-no-matches">還沒有遊玩紀錄，完成第一場猜歌後就會顯示戰績。</p> : null}
    <section className="public-player-collections" aria-labelledby="public-player-collections-title">
      <div className="public-player-section-heading"><h2 id="public-player-collections-title">用音樂認識我</h2><span>{profile.publicCollectionCount} 份公開題庫</span></div>
      {collections.isPending ? <p className="public-player-state" role="status">正在載入公開題庫…</p>
        : collections.isError ? <div className="public-player-state" role="alert"><p>題庫暫時載入失敗</p><button type="button" onClick={() => void collections.refetch()}>重新載入題庫</button></div>
        : collections.data?.items.length ? <ul className="public-player-collection-list">{collections.data.items.map((item) => <li key={item.id}>
          <a href={`/rooms?sharedCollection=${encodeURIComponent(item.id)}`} target="_blank" rel="noopener noreferrer" aria-label={`查看題庫：${item.title}（另開分頁）`}>
            {item.coverThumbnailUrl ? <img src={item.coverThumbnailUrl} alt="" loading="lazy" /> : <span className="public-player-collection-art"><LibraryMusicRounded /></span>}
            <div><h3>{item.title}</h3>{item.description ? <p>{item.description}</p> : null}<span>{item.itemCount} 題 · {item.useCount.toLocaleString()} 次遊玩</span></div>
            <ArrowForwardRounded fontSize="small" />
          </a></li>)}</ul>
          : <div className="public-player-empty" role="status"><LibraryMusicRounded aria-hidden="true" /><h3>{profile.canEdit ? "分享你的第一份公開題庫" : "這位玩家還沒有公開題庫"}</h3><p>{profile.canEdit ? "到收藏庫完成並公開作品，就會出現在這裡，讓大家一起猜歌。" : "之後公開的作品會列在這裡，先從戰績和自介認識彼此吧。"}</p>{profile.canEdit ? <Link to="/collections" target="_blank" rel="noopener noreferrer">管理我的題庫 ↗</Link> : null}</div>}
      {collections.data && collections.data.total > collections.data.pageSize ? <nav className="public-player-pagination" aria-label="題庫分頁"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一頁</button><span>第 {page} 頁</span><button type="button" disabled={page * collections.data.pageSize >= collections.data.total} onClick={() => setPage(page + 1)}>下一頁</button></nav> : null}
    </section>
  </main>;
}
