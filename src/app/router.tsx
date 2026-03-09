import { Navigate, Route, Routes } from "react-router-dom";

import RequireAuthRoute from "./guards/RequireAuthRoute";
import LandingHomePage from "../features/Landing/ui/LandingHomePage";
import RoomsLayoutShell from "../features/Room/ui/RoomsLayoutShell";
import RoomListPage from "../features/Room/ui/RoomListPage";
import RoomCreatePage from "../features/Room/ui/RoomCreatePage";
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
        <Route path="/rooms/create" element={<RoomCreatePage />} />
        <Route path="/rooms/:roomId" element={<RoomLobbyPage />} />
        <Route
          path="/history"
          element={
            <RequireAuthRoute
              title="對戰歷史需要登入"
              description="登入後即可查看完整對戰記錄與回顧。"
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
              title="收藏庫需要登入"
              description="登入後才可管理你的收藏與題庫。"
            >
              <CollectionsPage />
            </RequireAuthRoute>
          }
        />
        <Route
          path="/collections/new"
          element={
            <RequireAuthRoute
              title="建立收藏需要登入"
              description="請先登入後再建立新的收藏。"
            >
              <CollectionsCreatePage />
            </RequireAuthRoute>
          }
        />
        <Route
          path="/collections/:collectionId/edit"
          element={
            <RequireAuthRoute
              title="編輯收藏需要登入"
              description="請先登入後再編輯收藏內容。"
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
