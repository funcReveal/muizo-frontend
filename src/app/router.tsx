import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import {
  AccountCircleRounded,
  AddCircleOutlineRounded,
  BookmarksRounded,
  EditNoteRounded,
  ManageAccountsRounded,
  LibraryMusicRounded,
  WorkspacePremiumRounded,
} from "@mui/icons-material";

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
const AuthVerifyPendingPage = lazy(
  () => import("@features/Auth/ui/AuthVerifyPendingPage"),
);
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
const MembershipPage = lazy(() => import("@features/Membership"));
const OnboardingPage = lazy(() =>
  import("@features/Onboarding").then(({ OnboardingPage }) => ({
    default: OnboardingPage,
  })),
);
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
              featureIcon={<LibraryMusicRounded sx={{ fontSize: 23 }} />}
              currentBreadcrumbLabel="收藏庫"
              title="收藏庫需登入後使用"
              description="登入後可查看、管理你的收藏題庫與公開狀態。"
            >
              <Suspense fallback={<PageLoader />}>
                <CollectionsPage />
              </Suspense>
            </RequireAuthRoute>
          }
        />

        <Route
          path="/membership"
          element={
            <RequireAuthRoute
              featureIcon={<WorkspacePremiumRounded sx={{ fontSize: 23 }} />}
              currentBreadcrumbLabel="會員升級"
              title="登入後查看會員方案"
              description="會員方案會依帳號身分套用，登入後即可查看目前方案與可升級項目。"
            >
              <Suspense fallback={<PageLoader />}>
                <MembershipPage />
              </Suspense>
            </RequireAuthRoute>
          }
        />

        <Route
          path="/onboarding"
          element={
            <RequireAuthRoute
              featureIcon={<ManageAccountsRounded sx={{ fontSize: 23 }} />}
              currentBreadcrumbLabel="帳號設定"
              title="完成帳號設定"
              description="登入後即可補上名稱、性別與生日，讓 Muizo 提供更合適的題庫與帳號體驗。"
            >
              <Suspense fallback={<PageLoader />}>
                <OnboardingPage />
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
                featureIcon={<AddCircleOutlineRounded sx={{ fontSize: 23 }} />}
                currentBreadcrumbLabel="建立收藏"
                title="建立收藏需先登入"
                description="登入後即可建立新收藏，並同步到你的帳號。"
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
                featureIcon={<EditNoteRounded sx={{ fontSize: 23 }} />}
                currentBreadcrumbLabel="編輯收藏"
                title="編輯收藏需先登入"
                description="請先登入帳號，再進行收藏內容編修與管理。"
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
                featureIcon={<AccountCircleRounded sx={{ fontSize: 23 }} />}
                currentBreadcrumbLabel="生涯總覽"
                title="登入後即可查看生涯總覽"
                description="生涯紀錄會綁定帳號保存，登入後可跨裝置查看完整對戰歷史。"
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
              featureIcon={<BookmarksRounded sx={{ fontSize: 23 }} />}
              currentBreadcrumbLabel="收藏歌曲"
              title="登入後查看收藏歌曲"
              description="收藏歌曲會依你的帳號同步，登入後可查看遊戲中記錄的歌曲與影片。"
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
        path="/auth/verify-pending"
        element={
          <Suspense fallback={<PageLoader />}>
            <AuthVerifyPendingPage />
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
