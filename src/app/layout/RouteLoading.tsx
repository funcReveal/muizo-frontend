import "./routeLoading.css";

/** Both shell and page Suspense boundaries share viewport coordinates. */
export default function RouteLoading() {
  return <div className="app-route-loading" role="status" aria-label="正在載入">
    <span className="app-route-loading__bars" aria-hidden="true"><i /><i /><i /></span>
  </div>;
}
