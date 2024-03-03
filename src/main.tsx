import React from "react";
import ReactDOM from "react-dom/client";
import ArConnectStrategy from "@arweave-wallet-kit-beta/arconnect-strategy";
import BrowserWalletStrategy from "@arweave-wallet-kit-beta/browser-wallet-strategy";
import ArweaveAppStrategy from "@arweave-wallet-kit/webwallet-strategy";
import { ArweaveWalletKit } from "@arweave-wallet-kit-beta/react";
import { ConfigProvider, theme } from "antd";

import App from "./App.tsx";
import "./index.css";
import NavBar from "./components/NavBar.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
      <ArweaveWalletKit
        config={{
          strategies: [
            new ArConnectStrategy(),
            new ArweaveAppStrategy(),
            new BrowserWalletStrategy(),
          ],
          permissions: ["ACCESS_ADDRESS", "SIGN_TRANSACTION"],
          ensurePermissions: true,
        }}
        theme={{
          displayTheme: "light",
        }}
      >
        <NavBar />
        <App />
      </ArweaveWalletKit>
    </ConfigProvider>
  </React.StrictMode>
);
