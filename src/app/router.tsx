import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import RequireAuthRoute from "./guards/RequireAuthRoute";
import AppLayoutShell from "./layout/AppLayoutShell";
import { LegalLayout, PrivacyPage, TermsPage } from "@features/Legal";
import { isCareerFeatureEnabled } from "@shared/config/featureFlags";

// ---------------------------------------------------------------------------
// Route-level code splitting
// Each page chunk loads on first navigation to that route, not on app boot.
// Keep layout shells and legal pages as static imports because they are thin
// wrappers / instantly-needed on their route groups.
// ---------------------------------------------------------------------------

const LandingHomePage = lazy(() => import("@features/Landing"));
const AuthActionPage = lazy(() => import("@features/Auth/ui/AuthActionPage"));
const RoomSessionLayoutShell = lazy(
  () => import("./layout/RoomSessionLayoutShell"),
);
const CollectionContentLayoutShell = lazy(
  () => import("./layout/CollectionContentLayoutShell"),
);
const RoomsHubPage = lazy(() => import("@features/RoomHub"));
const RoomLobbyPage = lazy(() => import("@features/RoomLobby"));
const CareerPage = lazy(() => import("@features/Career"));
const FavoriteSongsPage = lazy(() => import("@features/SongFavorite"));
const InvitedPage = lazy(() => import("@features/Invited"));
const CollectionsPage = lazy(() => import("@features/Collections"));
const CollectionsCreatePage = lazy(() =>
  import("@features/Collections").then(({ CollectionCreatePage }) => ({
    default: CollectionCreatePage,
  })),
);
const CollectionsEditPage = lazy(() =>
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
                  <CollectionsEditPage />
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
          path="/history"
          element={
            <Navigate
              to={isCareerFeatureEnabled ? "/career" : "/rooms"}
              replace
            />
          }
        />

        <Route
          path="/career"
          element={
            isCareerFeatureEnabled ? (
              <RequireAuthRoute
                badge="Career Access"
                title="登入後即可查看生涯總覽"
                description="生涯紀錄會綁定帳號保存，登入後可跨裝置查看完整對戰歷史。"
                highlights={["完整對戰回顧", "個人戰績總覽", "題庫排行表現"]}
              >
                <Suspense fallback={<PageLoader />}>
                  <CareerPage />
                </Suspense>
              </RequireAuthRoute>
            ) : (
              <Navigate to="/rooms" replace />
            )
          }
        />

        <Route
          path="/me/favorites"
          element={
            <RequireAuthRoute
              badge="Song Favorites"
              title="登入後查看收藏歌曲"
              description="收藏歌曲會依你的帳號同步，登入後可查看遊戲中記錄的歌曲與影片。"
              highlights={[
                "遊戲中快速收藏",
                "依最後收藏排序",
                "集中開啟 YouTube 影片",
              ]}
            >
              <Suspense fallback={<PageLoader />}>
                <FavoriteSongsPage />
              </Suspense>
            </RequireAuthRoute>
          }
        />

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
      </Route>

      <Route path="/auth/callback" element={<PageLoader />} />
      <Route
        path="/auth/verify-email"
        element={
          <Suspense fallback={<PageLoader />}>
            <AuthActionPage mode="verify-email" />
          </Suspense>
        }
      />
      <Route
        path="/auth/reset-password"
        element={
          <Suspense fallback={<PageLoader />}>
            <AuthActionPage mode="reset-password" />
          </Suspense>
        }
      />

      <Route element={<LegalLayout />}>
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
