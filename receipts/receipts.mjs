#!/usr/bin/env node
// Receipts for Claude Code: records the shell commands run in a session, and checks the
// "Verified:" part of the end-of-task report against that record before the agent stops.
// It also stops the servers the agent started and left behind, when the session ends and,
// for a session that ended without that, when the next one starts.
// Usage (from receipts/hooks.json): receipts.mjs before | record | check | end | start
// No dependencies: Node.js 18.3 or later.

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { listenerPids, startTime, stopProcess } from "./processes.mjs";

// Programs a "Verified" claim usually starts with. Spans starting with anything else
// (file names, flags, prose) are only checked if a recorded command starts the same way.
const RUNNERS = new Set([
  "npm", "npx", "pnpm", "yarn", "bun", "bunx", "deno", "node", "tsc", "eslint", "prettier",
  "jest", "vitest", "mocha", "playwright", "cypress", "next", "vite", "turbo", "nx",
  "python", "python3", "py", "pip", "pytest", "ruff", "mypy", "uv", "poetry", "tox",
  "go", "cargo", "rustc", "make", "cmake", "ctest", "dotnet", "mvn", "gradle", "./gradlew",
  "ruby", "bundle", "rake", "rspec", "rails", "php", "composer", "phpunit",
  "swift", "xcodebuild", "flutter", "dart", "docker", "kubectl", "terraform", "git", "gh",
  "bash", "sh", "pwsh", "powershell", "curl",
]);

const LABEL = /^[\s>*_#\-\d.)]*\**\s*(not verified|verified|changed|decisions|left running)\s*\**\s*:?/i;
const ACKNOWLEDGED_FAILURE = /\b(fail(s|ed|ing|ure)?|exit(ed)? (with )?code|non-zero|broken)\b/i;

export function verifiedSection(message) {
  const lines = [];
  let inside = false;
  for (const line of String(message ?? "").split(/\r?\n/)) {
    const label = line.match(LABEL);
    if (label) {
      inside = label[1].toLowerCase() === "verified";
      if (inside) lines.push(line.slice(label[0].length));
      continue;
    }
    if (inside) lines.push(line);
  }
  return lines;
}

const normalise = (text) => text.replace(/\s+/g, " ").replace(/["']/g, "").trim();
const firstWord = (text) => normalise(text).split(" ")[0];

export function checkClaims(message, runs) {
  const starts = new Set(runs.map((run) => firstWord(run.command)));
  const problems = [];
  for (const line of verifiedSection(message)) {
    for (const [, span] of line.matchAll(/`([^`\n]+)`/g)) {
      const claim = normalise(span);
      if (!claim || !(RUNNERS.has(firstWord(claim)) || starts.has(firstWord(claim)))) continue;
      const matching = runs.filter((run) => {
        const command = normalise(run.command);
        return command.includes(claim) || claim.includes(command);
      });
      if (matching.length === 0) {
        problems.push(`\`${span}\`: no command like this ran in this session.`);
        continue;
      }
      const last = matching[matching.length - 1];
      if (last.exitCode !== 0 && !ACKNOWLEDGED_FAILURE.test(line)) {
        const how = last.exitCode === null ? "did not finish" : `exited with code ${last.exitCode}`;
        problems.push(`\`${span}\`: the last time it ran, it ${how}.`);
      }
    }
  }
  return problems;
}

// Guarded, often irreversible Git actions (see "Guard irreversible actions"). Each is allowed
// only when the user asked for it in this conversation. The record can't know whether they did,
// but it can make sure the agent owned the action in its report: if one ran and the report never
// mentions it, the agent is sent back to disclose and justify it, or undo it. Once a report owns
// an action it is not raised again; the same kind of action happening later is.
// A flag is read only up to the end of its own command: `;`, `&` or `|` start the next one,
// so `git commit -m x && sed -n 1p` is not a --no-verify. Quoted text is blanked first, so a
// commit message neither hides a flag after it ("a; b" --no-verify) nor counts as one.
const GUARDRAILS = [
  {
    what: "force-pushed",
    test: /\bgit\s+push\b[^\n;&|]*(--force(-with-lease)?\b|\s-f\b|\s\+[^\s+])/i,
    ack: /force[- ]?push|--force|-f\b/i,
  },
  {
    what: "skipped Git hooks with --no-verify",
    test: /\bgit\s+(commit|push)\b[^\n;&|]*(--no-verify\b|\s-n\b)/i,
    ack: /no-verify|skip\w*\s+hook|hook\w*\s+skip/i,
  },
  {
    what: "staged everything instead of by name (git add -A / .)",
    test: /\bgit\s+add\s+(-A\b|--all\b|\.(?=\s|$))/i,
    ack: /add\s+(-a\b|--all\b|\.)/i,
  },
  {
    what: "rewrote history (amend / rebase / reset --hard)",
    test: /\bgit\s+(commit[^\n;&|]*--amend\b|rebase\b|reset[^\n;&|]*--hard\b)/i,
    ack: /amend|rebase|reset[^\n]*--hard/i,
  },
  {
    what: "changed Git config",
    test: /\bgit[ \t]+config[ \t]+(?:--(?:global|local|system)[ \t]+)?[\w.]+[ \t]+(?!\d*[>|&;<])["']?\S/i,
    ack: /git\s+config|config\w*\s+(chang|set|updat)/i,
  },
];

// Empties quoted strings, keeping the quotes: "a; b" -> "". Double quotes may span lines
// (a heredoc commit message); single quotes stay on one line, so a stray apostrophe can't
// blank the rest of a script.
const unquote = (command) => command.replace(/"(?:[^"\\]|\\.)*"|'[^'\n]*'/g, (quoted) => quoted[0] + quoted[0]);

export function checkGuardrails(message, log) {
  const text = String(message ?? "");
  const problems = [];
  const owned = [];
  for (const rule of GUARDRAILS) {
    const since = log.slice(log.findLastIndex((entry) => entry.owned === rule.what) + 1);
    const hit = since.find((entry) => entry.command !== undefined && rule.test.test(unquote(entry.command)));
    if (!hit) continue;
    if (rule.ack.test(text)) owned.push(rule.what);
    else problems.push(`this session ${rule.what} (\`${normalise(hit.command)}\`) but your report never mentions it.`);
  }
  return { problems, owned };
}

// Servers, watchers and tails the agent starts to check its work (see "Verify before completion").
// They have no window, so a forgotten one keeps running unseen after the session, and enough of
// them freeze a laptop. Before the agent stops, each one the session started is checked:
// - when its port is known (a --port/-p flag, PORT=, or the tool's default), on this machine. Just
//   before the command runs, the ports it may use (that one and the next ten, where dev servers
//   move when it is taken) are tried; a port that already answered then belongs to someone else.
//   The server still runs when one of the others answers now, from a process that started after
//   the command did;
// - otherwise, from Claude Code's list of background tasks still running, or, without it, from the
//   record: still running means no later command stopped anything.
// The agent is sent back to stop what still runs, or to list it under "Left running" when the
// user asked to keep it. A server proven to be the agent's is recorded with its process ID and
// start time, so the cleanup can stop that very process later and nothing that reused its port.
const END = String.raw`(?=$|[\s;&|)])`;
const SERVER = new RegExp(
  String.raw`\b(?:next\s+(?:dev|start)|astro\s+(?:dev|preview)|nuxt\s+(?:dev|preview)|vite(?:\s+(?:dev|preview|serve)|(?=\s*(?:$|[;&|)]|--?\w)))|` +
    String.raw`wrangler\s+(?:dev|tail)|(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:dev|start|serve|preview)|` +
    String.raw`http\.server|uvicorn|flask\s+run|runserver|rails\s+s(?:erver)?|artisan\s+serve|docker\s+compose\s+up)${END}`,
  "i",
);
const DEFAULT_PORTS = [
  [/^vite\s+preview/i, 4173], [/^vite/i, 5173], [/^astro/i, 4321], [/^(?:next|nuxt|rails)/i, 3000],
  [/^wrangler\s+dev/i, 8787], [/^flask/i, 5000], [/^(?:http\.server|uvicorn|runserver|artisan)/i, 8000],
];
const MOVED_PORTS = 10;
const STOPPED = /\b(?:kill(?:all)?|pkill|taskkill|stop-process|docker\s+compose\s+(?:down|stop))\b/i;
// Starts a process that outlives its shell: `cmd &` (not &&, 2>&1 or &>), nohup, Windows `start`,
// Start-Process, or a detached compose.
const DETACHES = /(?:^|[^&>])&(?![&>\d])|\bnohup\b|(?:^|[;&|]\s*)start\s|\bstart-process\b|\bup\b[^\n;&|]*\s-d\b/i;
const LEFT_RUNNING = "left a server running";
// What the report must say about a server the record can't confirm stopped...
const LEFT_RUNNING_ACK = /left running|still running|(?:stopp?ed|killed)\b[^\n]*\b(?:server|process|watcher)|(?:server|process|watcher)s?\b[^\n]*\b(?:stopp?ed|killed)\b/i;
// ...and about one that is shown to be running: saying it was stopped is not enough.
const KEPT_ACK = /\bleft running\b/i;

function serverPort(command, at, tool) {
  // The port belongs to the command the server was started in, between two separators.
  const from = Math.max(...[";", "&", "|", "\n"].map((separator) => command.lastIndexOf(separator, at))) + 1;
  const rest = command.slice(at).search(/[;&|\n]/);
  const own = command.slice(from, rest === -1 ? undefined : at + rest);
  const explicit = own.match(/(?:--port[=\s]+|\s-p\s*|\bPORT=|http\.server\s+|runserver\s+(?:[\w.]+:)?)(\d{2,5})\b/i);
  if (explicit) return Number(explicit[1]);
  return DEFAULT_PORTS.find(([pattern]) => pattern.test(tool))?.[1];
}

// The ports a server command may end up on: its own, and the next ones dev servers move to.
const portRange = (port) => Array.from({ length: MOVED_PORTS + 1 }, (_, i) => port + i).filter((p) => p <= 65535);

// The servers this session started since a report last owned one:
// [{ index, command, port, ports, after }]. `ports` and `after` exist only when the ports were
// tried just before the command ran: `ports` are the ones that were free, `after` is when.
export function startedServers(log) {
  const since = log.slice(log.findLastIndex((entry) => entry.owned === LEFT_RUNNING) + 1);
  const servers = [];
  since.forEach((entry, index) => {
    const command = entry.command;
    if (command === undefined) return;
    const found = new RegExp(SERVER.source, "gi");
    for (const match of command.matchAll(found)) {
      const port = serverPort(command, match.index, match[0]);
      const before = since.slice(0, index).findLast((earlier) => earlier.before?.command === command)?.before;
      const server = { index, command, port };
      if (port !== undefined && before) {
        server.ports = portRange(port).filter((p) => !before.taken.includes(p));
        // A process that started at or after this time can't have been running before the command.
        server.after = before.clock ?? Date.parse(before.at) - 1000;
      }
      servers.push(server);
    }
  });
  return { since, servers };
}

// `listening` is the set of ports the agent's servers answer on, checked by the caller.
// `background` is Claude Code's list of background tasks still running, when it sends one.
export function checkLeftRunning(message, log, listening = new Set(), background) {
  const { since, servers } = startedServers(log);
  const stopped = (index) => since.slice(index).some((entry) => STOPPED.test(entry.command ?? ""));
  const shown = [];
  const unconfirmed = [];
  for (const server of servers) {
    const name = `\`${normalise(server.command)}\``;
    let problem;
    let sure = true;
    if (server.ports) {
      const live = server.ports.filter((port) => listening.has(port));
      if (live.length === 0) continue;
      problem = `this session started ${name} and it is still listening on ${live.map((port) => `localhost:${port}`).join(", ")}.`;
    } else if (server.port !== undefined) {
      // No snapshot from before the command (a record from an older version): something answers
      // on the port, but it may not be the agent's, so this is reported and never stopped.
      if (!listening.has(server.port)) continue;
      problem = `this session started ${name} and something is still listening on localhost:${server.port}.`;
      sure = false;
    } else if (Array.isArray(background) && !DETACHES.test(server.command)) {
      if (!background.some((task) => normalise(task?.command ?? "") === normalise(server.command))) continue;
      problem = `this session started ${name} in the background and it is still running.`;
    } else {
      if (stopped(server.index)) continue;
      problem = `this session started ${name} and nothing in the record stopped it.`;
      sure = false;
    }
    if (shown.includes(problem) || unconfirmed.includes(problem)) continue;
    (sure ? shown : unconfirmed).push(problem);
  }
  const problems = [...shown, ...unconfirmed];
  if (problems.length === 0) return { problems, owned: [] };
  const text = String(message ?? "");
  const owns = (shown.length === 0 || KEPT_ACK.test(text)) && (unconfirmed.length === 0 || LEFT_RUNNING_ACK.test(text));
  return owns ? { problems: [], owned: [LEFT_RUNNING] } : { problems, owned: [] };
}

// Connects to a port on this machine (IPv4 and IPv6) and resolves true if anything answers.
function answers(port, timeout = 400) {
  const attempt = (host) =>
    new Promise((done) => {
      const socket = connect({ port, host });
      const finish = (ok) => { socket.destroy(); done(ok); };
      socket.setTimeout(timeout, () => finish(false));
      socket.once("connect", () => finish(true));
      socket.once("error", () => finish(false));
    });
  return Promise.all([attempt("127.0.0.1"), attempt("::1")]).then((results) => results.some(Boolean));
}

// The ports the agent's servers answer on, and the processes behind them. A port counts when a
// process that started after the server command listens there; when the process can't be looked
// up, an answer is enough to report it, but it isn't recorded, so it is never stopped.
async function agentListeners(log) {
  const after = new Map();
  const unproven = new Set();
  for (const server of startedServers(log).servers) {
    for (const port of server.ports ?? []) after.set(port, Math.min(after.get(port) ?? Infinity, server.after));
    if (!server.ports && server.port !== undefined) unproven.add(server.port);
  }
  const ports = [...after.keys()];
  const open = await Promise.all(ports.map((port) => answers(port)));
  const listening = new Set();
  const found = [];
  for (const port of unproven) if (!after.has(port) && (await answers(port))) listening.add(port);
  for (const port of ports.filter((_, i) => open[i])) {
    const pids = listenerPids(port);
    if (pids.length === 0) listening.add(port);
    for (const pid of pids) {
      const started = startTime(pid);
      if (started === undefined) listening.add(port);
      else if (started >= after.get(port)) {
        listening.add(port);
        found.push({ port, pid, started });
      }
    }
  }
  return { listening, found };
}

function logDir() {
  const dir = join(process.env.CLAUDE_PLUGIN_DATA || tmpdir(), "receipts");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function logFile(sessionId) {
  return join(logDir(), `${String(sessionId).replace(/[^\w-]/g, "_")}.jsonl`);
}

function readLog(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

function record(input) {
  const command = input.tool_input?.command;
  if (typeof command !== "string") return;
  let exitCode = 0;
  if (input.hook_event_name === "PostToolUseFailure") {
    const code = String(input.error ?? "").match(/Exit code (-?\d+)/);
    exitCode = code ? Number(code[1]) : null;
  }
  appendFileSync(logFile(input.session_id), `${JSON.stringify({ command, exitCode, at: new Date().toISOString() })}\n`);
}

// Just before a server command runs: which of the ports it may use already answer.
async function before(input) {
  const command = input.tool_input?.command;
  if (typeof command !== "string") return;
  const ports = new Set();
  for (const match of command.matchAll(new RegExp(SERVER.source, "gi"))) {
    const port = serverPort(command, match.index, match[0]);
    if (port !== undefined) for (const p of portRange(port)) ports.add(p);
  }
  if (ports.size === 0) return;
  const list = [...ports];
  const open = await Promise.all(list.map((port) => answers(port)));
  const taken = list.filter((_, i) => open[i]);
  // This hook's own start time, read the way a server's will be: on Linux a process start time
  // comes from the boot time and can sit seconds away from the wall clock, so a server's start
  // is compared with this rather than with the time now.
  const clock = startTime(process.pid);
  appendFileSync(logFile(input.session_id), `${JSON.stringify({ before: { command, at: new Date().toISOString(), clock, taken } })}\n`);
}

const sameServer = (a, b) => a.pid === b.pid && a.started === b.started;

// Stops the agent's servers recorded in one session log that still run: the same process
// (process ID and start time) still listening on the same port. Servers a report left running
// on purpose are only listed, unless `all`. Returns what it stopped and what it kept.
async function cleanup(file, { all = false } = {}) {
  const log = readLog(file);
  const ownedAt = log.findLastIndex((entry) => entry.owned === LEFT_RUNNING);
  const done = log.filter((entry) => entry.gone).map((entry) => entry.gone);
  const result = { stopped: [], kept: [] };
  const seen = [];
  for (const [index, entry] of log.entries()) {
    const server = entry.server;
    if (!server || done.some((gone) => sameServer(gone, server)) || seen.some((s) => sameServer(s, server))) continue;
    seen.push(server);
    const same = (await answers(server.port)) && listenerPids(server.port).includes(server.pid) && startTime(server.pid) === server.started;
    if (!same) {
      appendFileSync(file, `${JSON.stringify({ gone: server })}\n`);
      continue;
    }
    if (index < ownedAt && !all) {
      result.kept.push(server);
      continue;
    }
    if (await stopProcess(server.pid)) {
      appendFileSync(file, `${JSON.stringify({ gone: server })}\n`);
      result.stopped.push(server);
    }
  }
  return result;
}

const describe = (server) => `\`${normalise(server.command)}\` on localhost:${server.port} (process ${server.pid})`;

// The session is ending: stop the servers it started and did not leave running on purpose.
async function end(input) {
  await cleanup(logFile(input.session_id));
}

// A session is starting: stop what earlier sessions left behind without a cleanup, such as a
// crash or a closed window, and tell the agent so it can tell the user. This also runs when a
// session resumes or compacts, so the session's own record is left alone.
async function start(input) {
  const dir = logDir();
  const own = logFile(input.session_id);
  const recent = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const stopped = [];
  const kept = [];
  for (const name of readdirSync(dir).filter((file) => file.endsWith(".jsonl"))) {
    const file = join(dir, name);
    if (file === own || statSync(file).mtimeMs < recent) continue;
    const result = await cleanup(file);
    stopped.push(...result.stopped);
    kept.push(...result.kept);
  }
  const lines = [];
  if (stopped.length) lines.push("Maison GR receipts stopped servers that earlier sessions left running:", ...stopped.map((s) => `- ${describe(s)}`));
  if (kept.length) lines.push("Maison GR receipts: servers an earlier session left running on purpose are still running:", ...kept.map((s) => `- ${describe(s)}`));
  if (lines.length) process.stdout.write(`${lines.join("\n")}\nMention this to the user.\n`);
}

async function check(input) {
  const message = input.last_assistant_message;
  const file = logFile(input.session_id);
  const log = readLog(file);
  const { problems: guardrails, owned } = checkGuardrails(message, log);
  const { listening, found } = await agentListeners(log);
  const known = log.filter((entry) => entry.server).map((entry) => entry.server);
  const commandOf = (port) => startedServers(log).servers.findLast((server) => server.ports?.includes(port))?.command ?? "";
  for (const server of found) {
    if (!known.some((k) => sameServer(k, server))) appendFileSync(file, `${JSON.stringify({ server: { ...server, command: commandOf(server.port) } })}\n`);
  }
  const { problems: running, owned: ownedRunning } = checkLeftRunning(message, log, listening, input.background_tasks);
  for (const what of [...owned, ...ownedRunning]) appendFileSync(file, `${JSON.stringify({ owned: what })}\n`);
  // Block once at most: if the agent was already sent back, let it stop.
  if (input.stop_hook_active) return;
  const claims = checkClaims(message, log.filter((entry) => entry.command !== undefined));
  if (claims.length === 0 && guardrails.length === 0 && running.length === 0) return;
  const parts = [];
  if (claims.length) {
    parts.push(
      "Maison GR receipts: your report lists commands under \"Verified\" that this session's record does not support:",
      ...claims.map((problem) => `- ${problem}`),
      "Run them now and report the real result, or move them to \"Not verified\" with the reason.",
    );
  }
  if (guardrails.length) {
    if (parts.length) parts.push("");
    parts.push(
      "Maison GR receipts: this session took a guarded action without owning it in the report:",
      ...guardrails.map((problem) => `- ${problem}`),
      "Each is allowed only if the user asked for it here. Say so and justify it in your report, or undo it.",
    );
  }
  if (running.length) {
    if (parts.length) parts.push("");
    parts.push(
      "Maison GR receipts: this session started a server that may still be running:",
      ...running.map((problem) => `- ${problem}`),
      "Stop it now. If the user asked to keep it, list it under \"Left running\" with its address and how to stop it.",
    );
  }
  process.stdout.write(JSON.stringify({ decision: "block", reason: parts.join("\n") }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, "utf8"));
  const mode = process.argv[2];
  if (mode === "record") record(input);
  else if (mode === "before") await before(input);
  else if (mode === "check") await check(input);
  else if (mode === "end") await end(input);
  else if (mode === "start") await start(input);
}
