// The operating-system side of Receipts' server cleanup: which process listens on a local port,
// when it started, and how to stop it. Windows uses PowerShell (netstat as a fallback) and
// taskkill; macOS and Linux use lsof (or ss) and ps. Every lookup fails quietly: an unknown answer means "don't touch".
// No dependencies: Node.js 18.3 or later.

import { execFileSync } from "node:child_process";

const windows = process.platform === "win32";

function run(file, args) {
  try {
    return execFileSync(file, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 5000, windowsHide: true });
  } catch {
    return "";
  }
}

// Process IDs listening on a TCP port on this machine (and, on Windows, holding connections on
// it, which are the same process).
export function listenerPids(port) {
  const pids = new Set();
  if (windows) {
    // Get-NetTCPConnection first: on some machines netstat leaves listening sockets out of its
    // table (seen with network filter drivers installed), while this still names their process.
    const owners = run("powershell", [
      "-NoProfile", "-NonInteractive", "-Command",
      `Get-NetTCPConnection -LocalPort ${Number(port)} -ErrorAction SilentlyContinue | ForEach-Object { $_.OwningProcess }`,
    ]);
    for (const pid of owners.split(/\s+/)) if (pid) pids.add(Number(pid));
    if (pids.size === 0) {
      // "TCP  127.0.0.1:3000  0.0.0.0:0  LISTENING  4242". The state word is translated on some
      // systems, so a listener is recognised by its foreign address ending in ":0".
      for (const line of run("netstat", ["-ano"]).split(/\r?\n/)) {
        const columns = line.trim().split(/\s+/);
        if (!/^TCP$/i.test(columns[0]) || columns.length < 5) continue;
        if (columns[1].endsWith(`:${port}`) && columns[2].endsWith(":0")) pids.add(Number(columns[columns.length - 1]));
      }
    }
  } else {
    for (const pid of run("lsof", ["-nP", "-t", `-iTCP:${port}`, "-sTCP:LISTEN"]).split(/\s+/)) if (pid) pids.add(Number(pid));
    if (pids.size === 0) {
      for (const [, pid] of run("ss", ["-ltnpH", `sport = :${port}`]).matchAll(/pid=(\d+)/g)) pids.add(Number(pid));
    }
  }
  return [...pids].filter((pid) => Number.isInteger(pid) && pid > 4);
}

// When a process started, in milliseconds since the epoch, or undefined if it can't be read.
export function startTime(pid) {
  const text = windows
    ? run("powershell", ["-NoProfile", "-NonInteractive", "-Command", `(Get-Process -Id ${Number(pid)}).StartTime.ToUniversalTime().ToString('o')`])
    : run("ps", ["-o", "lstart=", "-p", String(Number(pid))]);
  const time = Date.parse(text.trim());
  return Number.isNaN(time) ? undefined : time;
}

// A stopped process can linger as a zombie on macOS and Linux until its parent collects it; it
// no longer runs or listens, so it counts as stopped.
const alive = (pid) => {
  try {
    process.kill(pid, 0);
  } catch (error) {
    return error.code === "EPERM";
  }
  return windows || !run("ps", ["-o", "stat=", "-p", String(pid)]).trim().startsWith("Z");
};

// Stops a process and, on Windows, the processes it started. Never this process or its parent.
export async function stopProcess(pid) {
  if (pid === process.pid || pid === process.ppid) return false;
  if (windows) {
    run("taskkill", ["/PID", String(pid), "/T", "/F"]);
  } else {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      return !alive(pid);
    }
    for (let waited = 0; waited < 2000 && alive(pid); waited += 100) await new Promise((done) => setTimeout(done, 100));
    if (alive(pid)) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {}
    }
  }
  for (let waited = 0; waited < 2000 && alive(pid); waited += 100) await new Promise((done) => setTimeout(done, 100));
  return !alive(pid);
}
