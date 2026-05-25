import { BrowserRouter } from "react-router-dom";

import "../shared/styles/App.css";
import AnalyticsPageTracker from "../shared/analytics/pageTracking";
import { AppProviders } from "./providers";
import { AppRouter } from "./router";
import RouteSeoManager from "@shared/seo/RouteSeoManager";

function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <RouteSeoManager />
        <AnalyticsPageTracker />
        <AppRouter />
      </AppProviders>
    </BrowserRouter>
  );
}

export default App;
