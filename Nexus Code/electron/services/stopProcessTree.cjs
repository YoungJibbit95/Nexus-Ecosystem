"use strict";

const { spawn } = require("child_process");
const path = require("path");

// Best effort for managed children; native code can detach/escape a process tree.
function stopProcessTree(proc) {
  if (!proc || !Number.isSafeInteger(proc.pid) || proc.pid <= 0) return;
  if (process.platform === "win32") {
    const taskkill = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "taskkill.exe");
    const killer = spawn(taskkill, ["/PID", String(proc.pid), "/T", "/F"], { shell: false, windowsHide: true, stdio: "ignore" });
    killer.on("error", () => { try { proc.kill("SIGKILL"); } catch {} });
  } else {
    // Managed processes are spawned as process-group leaders on Unix.
    try { process.kill(-proc.pid, "SIGKILL"); } catch { try { proc.kill("SIGKILL"); } catch {} }
  }
}

module.exports = { stopProcessTree };
