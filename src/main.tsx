import React from "react";
import ReactDOM from "react-dom/client";
import { StyleProvider } from "@ant-design/cssinjs";
import ArConnectStrategy from "@arweave-wallet-kit-beta/arconnect-strategy";
import BrowserWalletStrategy from "@arweave-wallet-kit-beta/browser-wallet-strategy";
import ArweaveAppStrategy from "@arweave-wallet-kit/webwallet-strategy";
import { ArweaveWalletKit } from "@arweave-wallet-kit-beta/react";
import { ConfigProvider, theme } from "antd";

import App from "./App.tsx";
import "./index.css";
import NavBar from "./components/NavBar.tsx";
import { HashRouter } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
      <StyleProvider hashPriority="high">
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
          <HashRouter>
            <NavBar />
            <App />
          </HashRouter>
        </ArweaveWalletKit>
      </StyleProvider>
    </ConfigProvider>
  </React.StrictMode>
);
