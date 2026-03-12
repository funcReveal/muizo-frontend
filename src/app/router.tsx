import { Navigate, Route, Routes } from "react-router-dom";

import RequireAuthRoute from "./guards/RequireAuthRoute";
import LandingHomePage from "../features/Landing/ui/LandingHomePage";
import RoomsLayoutShell from "../features/Room/ui/RoomsLayoutShell";
import RoomListPage from "../features/Room/ui/RoomListPage";
import RoomLobbyPage from "../features/Room/ui/RoomLobbyPage";
import RoomHistoryPage from "../features/Room/ui/RoomHistoryPage";
import CollectionsPage from "../features/Collections/ui/CollectionsPage";
import CollectionsCreatePage from "../features/Collections/ui/CollectionsCreatePage";
import EditPage from "../features/Collections/ui/EditPage";
import InvitedPage from "../features/Invited/ui/InvitedPage";
import LegalLayout from "../features/Legal/ui/LegalLayout";
import PrivacyPage from "../features/Legal/ui/PrivacyPage";
import TermsPage from "../features/Legal/ui/TermsPage";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<RoomsLayoutShell />}>
        <Route path="/" element={<LandingHomePage />} />
        <Route path="/rooms" element={<RoomListPage />} />
        <Route path="/rooms/:roomId" element={<RoomLobbyPage />} />
        <Route
          path="/history"
          element={
            <RequireAuthRoute
              badge="History Access"
              title="先建立身分即可查看對戰歷史"
              description="訪客可查看目前身分的對戰紀錄；登入可跨裝置保存完整歷史。"
              highlights={["完整對戰回放", "個人戰績", "跨裝置同步"]}
              allowGuest
            >
              <RoomHistoryPage />
            </RequireAuthRoute>
          }
        />
        <Route path="/settings" element={<Navigate to="/rooms" replace />} />
        <Route path="/invited/:roomId" element={<InvitedPage />} />
        <Route
          path="/collections"
          element={
            <RequireAuthRoute
              badge="Collections Access"
              title="收藏庫需登入後使用"
              description="登入後可查看、管理你的收藏題庫與公開狀態。"
              highlights={["私人收藏管理", "公開分享設定", "快速開房套用"]}
            >
              <CollectionsPage />
            </RequireAuthRoute>
          }
        />
        <Route
          path="/collections/new"
          element={
            <RequireAuthRoute
              badge="Create Collection"
              title="建立收藏需先登入"
              description="登入後即可建立新收藏，並同步到你的帳號。"
              highlights={["建立個人題庫", "同步播放清單", "後續可再編輯"]}
            >
              <CollectionsCreatePage />
            </RequireAuthRoute>
          }
        />
        <Route
          path="/collections/:collectionId/edit"
          element={
            <RequireAuthRoute
              badge="Edit Collection"
              title="編輯收藏需先登入"
              description="請先登入帳號，再進行收藏內容編修與管理。"
              highlights={["編修題目內容", "管理可見權限", "保留編輯紀錄"]}
            >
              <EditPage />
            </RequireAuthRoute>
          }
        />
      </Route>
      <Route element={<LegalLayout />}>
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
