#!/usr/bin/env node
// Receipts for Claude Code: records the shell commands run in a session, and checks the
// "Verified:" part of the end-of-task report against that record before the agent stops.
// Usage (from receipts/hooks.json): receipts.mjs record | receipts.mjs check
// No dependencies: Node.js 18.3 or later.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

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
// so `git commit -m x && sed -n 1p` is not a --no-verify.
const GUARDRAILS = [
  {
    what: "force-pushed",
    test: /\bgit\s+push\b[^\n;&|]*(--force(-with-lease)?\b|\s-f\b)/i,
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

export function checkGuardrails(message, log) {
  const text = String(message ?? "");
  const problems = [];
  const owned = [];
  for (const rule of GUARDRAILS) {
    const since = log.slice(log.findLastIndex((entry) => entry.owned === rule.what) + 1);
    const hit = since.find((entry) => entry.command !== undefined && rule.test.test(entry.command));
    if (!hit) continue;
    if (rule.ack.test(text)) owned.push(rule.what);
    else problems.push(`this session ${rule.what} (\`${normalise(hit.command)}\`) but your report never mentions it.`);
  }
  return { problems, owned };
}

// Servers, watchers and tails the agent starts to check its work (see "Verify before completion").
// They have no window, so a forgotten one keeps running unseen after the session, and enough of
// them freeze a laptop. If the record has one with no later command that stops it, the agent is
// sent back to stop it, or to list it under "Left running" when the user asked to keep it.
// A stop command is not matched to a process: any stop after the start counts.
const END = String.raw`(?=$|[\s;&|)])`;
const SERVER = new RegExp(
  String.raw`\b(?:next\s+(?:dev|start)|astro\s+(?:dev|preview)|nuxt\s+(?:dev|preview)|vite(?:\s+(?:dev|preview|serve)|(?=\s*(?:$|[;&|)]|--?\w)))|` +
    String.raw`wrangler\s+(?:dev|tail)|(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?(?:dev|start|serve|preview)|` +
    String.raw`http\.server|uvicorn|flask\s+run|runserver|rails\s+s(?:erver)?|artisan\s+serve|docker\s+compose\s+up)${END}`,
  "i",
);
const STOPPED = /\b(?:kill(?:all)?|pkill|taskkill|stop-process|docker\s+compose\s+(?:down|stop))\b/i;
const LEFT_RUNNING = "left a server running";
const LEFT_RUNNING_ACK = /left running|still running|(?:stopp?ed|killed)\b[^\n]*\b(?:server|process|watcher)|(?:server|process|watcher)s?\b[^\n]*\b(?:stopp?ed|killed)\b/i;

export function checkLeftRunning(message, log) {
  const since = log.slice(log.findLastIndex((entry) => entry.owned === LEFT_RUNNING) + 1);
  const commands = since.map((entry) => entry.command ?? "");
  const start = commands.findLastIndex((command) => SERVER.test(command));
  if (start === -1 || commands.slice(start).some((command) => STOPPED.test(command))) return { problems: [], owned: [] };
  if (LEFT_RUNNING_ACK.test(String(message ?? ""))) return { problems: [], owned: [LEFT_RUNNING] };
  return { problems: [`this session started \`${normalise(commands[start])}\` and nothing in the record stopped it.`], owned: [] };
}

function logFile(sessionId) {
  const dir = join(process.env.CLAUDE_PLUGIN_DATA || tmpdir(), "receipts");
  mkdirSync(dir, { recursive: true });
  return join(dir, `${String(sessionId).replace(/[^\w-]/g, "_")}.jsonl`);
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

function check(input) {
  const message = input.last_assistant_message;
  const file = logFile(input.session_id);
  const log = readLog(file);
  const { problems: guardrails, owned } = checkGuardrails(message, log);
  const { problems: running, owned: ownedRunning } = checkLeftRunning(message, log);
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
  else if (mode === "check") check(input);
}
