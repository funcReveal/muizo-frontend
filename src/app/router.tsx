import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import RequireAuthRoute from "./guards/RequireAuthRoute";
import AppLayoutShell from "./layout/AppLayoutShell";
import { LegalLayout, PrivacyPage, TermsPage } from "@features/Legal";

// ---------------------------------------------------------------------------
// Route-level code splitting
// Each page chunk loads on first navigation to that route, not on app boot.
// Keep layout shells and legal pages as static imports because they are thin
// wrappers / instantly-needed on their route groups.
// ---------------------------------------------------------------------------

const LandingHomePage = lazy(() => import("@features/Landing"));
const RoomSessionLayoutShell = lazy(
  () => import("./layout/RoomSessionLayoutShell"),
);
const CollectionContentLayoutShell = lazy(
  () => import("./layout/CollectionContentLayoutShell"),
);
const RoomsHubPage = lazy(() => import("@features/RoomHub"));
const RoomLobbyPage = lazy(() => import("@features/RoomLobby"));
// const CareerPage = lazy(() => import("@features/Career"));
const InvitedPage = lazy(() => import("@features/Invited"));
const CollectionsPage = lazy(() => import("@features/Collections"));
const CollectionsCreatePage = lazy(() =>
  import("@features/Collections").then(({ CollectionCreatePage }) => ({
    default: CollectionCreatePage,
  })),
);
const EditPage = lazy(() =>
  import("@features/Collections").then(({ CollectionEditPage }) => ({
    default: CollectionEditPage,
  })),
);

/** Minimal spinner used as the Suspense fallback for route transitions. */
const PageLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-slate-300" />
  </div>
);

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayoutShell />}>
        <Route
          path="/"
          element={
            <Suspense fallback={<PageLoader />}>
              <LandingHomePage />
            </Suspense>
          }
        />
        <Route path="/settings" element={<Navigate to="/rooms" replace />} />
        <Route
          path="/collections"
          element={
            <RequireAuthRoute
              badge="Collections Access"
              title="收藏庫需登入後使用"
              description="登入後可查看、管理你的收藏題庫與公開狀態。"
              highlights={["私人收藏管理", "公開分享設定", "快速開房套用"]}
            >
              <Suspense fallback={<PageLoader />}>
                <CollectionsPage />
              </Suspense>
            </RequireAuthRoute>
          }
        />
        <Route
          element={
            <Suspense fallback={<PageLoader />}>
              <CollectionContentLayoutShell />
            </Suspense>
          }
        >
          <Route
            path="/collections/new"
            element={
              <RequireAuthRoute
                badge="Create Collection"
                title="建立收藏需先登入"
                description="登入後即可建立新收藏，並同步到你的帳號。"
                highlights={["建立個人題庫", "同步播放清單", "後續可再編輯"]}
              >
                <Suspense fallback={<PageLoader />}>
                  <CollectionsCreatePage />
                </Suspense>
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
                <Suspense fallback={<PageLoader />}>
                  <EditPage />
                </Suspense>
              </RequireAuthRoute>
            }
          />
        </Route>
      </Route>
      <Route
        element={
          <Suspense fallback={<PageLoader />}>
            <RoomSessionLayoutShell />
          </Suspense>
        }
      >
        <Route
          path="/rooms"
          element={
            <Suspense fallback={<PageLoader />}>
              <RoomsHubPage />
            </Suspense>
          }
        />
        <Route
          path="/rooms/:roomId"
          element={
            <Suspense fallback={<PageLoader />}>
              <RoomLobbyPage />
            </Suspense>
          }
        />
        <Route
          path="/invited/:roomId"
          element={
            <Suspense fallback={<PageLoader />}>
              <InvitedPage />
            </Suspense>
          }
        />
        {/* <Route
          path="/history"
          element={
            <RequireAuthRoute
              badge="History Access"
              title="先建立身分即可查看生涯總覽"
              description="訪客可查看目前身分的對戰紀錄；登入可跨裝置保存完整歷史。"
              highlights={["完整對戰回放", "個人戰績", "跨裝置同步"]}
              allowGuest
            >
              <Suspense fallback={<PageLoader />}>
                <CareerPage />
              </Suspense>
            </RequireAuthRoute>
          }
        /> */}
      </Route>
      <Route element={<LegalLayout />}>
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
