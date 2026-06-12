import React from "react";
import ReactDOM from "react-dom/client";
import AppErrorBoundary from "./app/AppErrorBoundary";
import App from "./app/App";
import { installChunkLoadRecovery } from "./app/runtimeRecovery";
import "./shared/styles/index.css";

installChunkLoadRecovery();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
