"use strict";

function assertTrustedSender(event, window) {
  if (!window || window.isDestroyed() || !event?.sender || event.sender !== window.webContents ||
      event.sender.isDestroyed() || !event.senderFrame || event.senderFrame !== window.webContents.mainFrame) {
    throw new Error("Permission denied: untrusted IPC sender.");
  }
}

function createTrustedIpc(ipcMain, getWindow) {
  return Object.freeze({
    handle(channel, callback) {
      ipcMain.handle(channel, async (event, ...args) => {
        assertTrustedSender(event, getWindow());
        return callback(event, ...args);
      });
    },
    on(channel, callback) {
      ipcMain.on(channel, async (event, ...args) => {
        // Send channels have no error response; never dispatch or reply to a
        // rejected sender, and never leak payloads through unhandled rejections.
        try { assertTrustedSender(event, getWindow()); } catch { return; }
        try { await callback(event, ...args); } catch {
          console.error(`Native IPC listener failed: ${channel}`);
        }
      });
    },
  });
}

module.exports = { assertTrustedSender, createTrustedIpc };
