import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/App.jsx";
import "@/index.css";
import "@/globals.css";

// Initialize Capacitor StatusBar on native platforms
async function initCapacitor() {
  const isNative =
    typeof window !== "undefined" &&
    typeof window.Capacitor !== "undefined" &&
    window.Capacitor?.isNativePlatform?.();

  if (!isNative) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#060614" });
  } catch (e) {
    console.warn("[Nexus] StatusBar init failed:", e);
  }

  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    // Keyboard push body up instead of overlaying (prevents editor overlap)
    await Keyboard.setAccessoryBarVisible({ isVisible: true });
  } catch (e) {
    console.warn("[Nexus] Keyboard init failed:", e);
  }
}

initCapacitor();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
