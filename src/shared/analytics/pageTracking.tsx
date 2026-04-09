import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackGaPageView } from "./ga";

const LAST_NON_ROOM_ROUTE_STORAGE_KEY = "muizo:last-non-room-route";

const normalizePathname = (pathname: string) => {
  if (/^\/rooms\/[^/]+$/.test(pathname)) {
    return "/rooms/:roomId";
  }
  if (/^\/collections\/[^/]+\/edit$/.test(pathname)) {
    return "/collections/:collectionId/edit";
  }
  if (/^\/invited\/[^/]+$/.test(pathname)) {
    return "/invited/:roomId";
  }
  return pathname;
};

const AnalyticsPageTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const path = normalizePathname(location.pathname);
    trackGaPageView(path, document.title);

    const rawPath = `${location.pathname}${location.search}${location.hash}`;
    const isRoomDetailRoute = /^\/rooms\/[^/]+$/.test(location.pathname);
    if (!isRoomDetailRoute) {
      window.sessionStorage.setItem(LAST_NON_ROOM_ROUTE_STORAGE_KEY, rawPath);
    }
  }, [location.pathname]);

  return null;
};

export default AnalyticsPageTracker;
export { LAST_NON_ROOM_ROUTE_STORAGE_KEY };
