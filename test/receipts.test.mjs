import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../receipts/receipts.mjs", import.meta.url));

function session() {
  const data = mkdtempSync(join(tmpdir(), "maisongr-receipts-"));
  const id = "test-session";
  const hook = (mode, input) => {
    const result = spawnSync(process.execPath, [script, mode], {
      input: JSON.stringify({ session_id: id, ...input }),
      env: { ...process.env, CLAUDE_PLUGIN_DATA: data },
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  return {
    ran: (command) => hook("record", { hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command } }),
    failed: (command, code) =>
      hook("record", {
        hook_event_name: "PostToolUseFailure",
        tool_name: "Bash",
        tool_input: { command },
        error: `Exit code ${code}\nsome output`,
      }),
    stop: (message, extra = {}) => {
      const out = hook("check", { hook_event_name: "Stop", stop_hook_active: false, last_assistant_message: message, ...extra });
      return out ? JSON.parse(out) : null;
    },
  };
}

const report = (verified) =>
  `Done.\n\n**Changed:** src/app.ts\n**Verified:** ${verified}\n**Not verified:** \`npm run e2e\` (no browser here)\n**Decisions:** none`;

test("lets the agent stop when every verified command ran and passed", () => {
  const s = session();
  s.ran("npm test");
  s.ran("cd web && npm run lint");
  assert.equal(s.stop(report("`npm test` (42 passed), `npm run lint` clean")), null);
});

test("blocks a verified command that never ran", () => {
  const s = session();
  s.ran("npm run lint");
  const result = s.stop(report("`npm test` (42 passed)"));
  assert.equal(result.decision, "block");
  assert.match(result.reason, /`npm test`: no command like this ran/);
});

test("blocks a command reported as passing when it failed", () => {
  const s = session();
  s.failed("npm test", 1);
  const result = s.stop(report("`npm test` passed"));
  assert.equal(result.decision, "block");
  assert.match(result.reason, /`npm test`: the last time it ran, it exited with code 1/);
});

test("accepts a failure the report admits, and a later passing run", () => {
  const s = session();
  s.failed("npm test", 1);
  assert.equal(s.stop(report("`npm test` failed: 2 of 42 tests fail on main too")), null);
  s.ran("npm test");
  assert.equal(s.stop(report("`npm test` (42 passed)")), null);
});

test("ignores file names, prose and the Not verified section", () => {
  const s = session();
  assert.equal(s.stop(report("checked `src/app.ts` by reading it; output matches `README.md`")), null);
});

test("stays silent without a report, and never blocks twice in a row", () => {
  const s = session();
  assert.equal(s.stop("Here is the answer to your question."), null);
  assert.equal(s.stop(report("`npm test` passed"), { stop_hook_active: true }), null);
});

test("blocks a force-push the report doesn't mention", () => {
  const s = session();
  s.ran("git push --force origin fix/foo");
  const result = s.stop(report("reviewed the diff"));
  assert.equal(result.decision, "block");
  assert.match(result.reason, /force-pushed/);
});

test("allows a guarded action the report owns", () => {
  const s = session();
  s.ran("git push --force origin fix/foo");
  assert.equal(s.stop(report("force-pushed to update the PR, as you asked")), null);
});

test("does not flag an action again once a report owned it", () => {
  const s = session();
  s.ran("git push --force origin fix/foo");
  assert.equal(s.stop(report("force-pushed to update the PR, as you asked")), null);
  assert.equal(s.stop(report("next task done")), null);
});

test("remembers an action owned after being sent back", () => {
  const s = session();
  s.ran("git commit --no-verify -m wip");
  assert.equal(s.stop(report("done")).decision, "block");
  assert.equal(s.stop(report("I used --no-verify by mistake"), { stop_hook_active: true }), null);
  assert.equal(s.stop(report("next task done")), null);
});

test("keeps flagging an action no report owned", () => {
  const s = session();
  s.ran("git commit --no-verify -m wip");
  assert.equal(s.stop(report("done"), { stop_hook_active: true }), null);
  assert.equal(s.stop(report("next task done")).decision, "block");
});

test("flags the same kind of action again when it happens again", () => {
  const s = session();
  s.ran("git push --force origin fix/foo");
  assert.equal(s.stop(report("force-pushed, as you asked")), null);
  s.ran("git push --force origin fix/bar");
  assert.match(s.stop(report("next task done")).reason, /fix\/bar/);
});

test("blocks blind staging the report doesn't mention", () => {
  const s = session();
  s.ran("git add -A");
  const result = s.stop(report("committed the change"));
  assert.equal(result.decision, "block");
  assert.match(result.reason, /staged everything/);
});

test("flags --no-verify, history rewrites and git config changes", () => {
  const s = session();
  s.ran("git commit --no-verify -m wip");
  s.ran("git commit --amend -m fix");
  s.ran('git config user.email "x@y.z"');
  const result = s.stop(report("done"));
  assert.equal(result.decision, "block");
  assert.match(result.reason, /--no-verify/);
  assert.match(result.reason, /rewrote history/);
  assert.match(result.reason, /changed Git config/);
});

test("does not flag staging by name, a plain commit, or a config read", () => {
  const s = session();
  s.ran("git add src/app.ts test/app.test.ts");
  s.ran("git commit -m 'fix: thing'");
  s.ran("git config user.name");
  assert.equal(s.stop(report("committed the fix")), null);
});

test("does not read a flag of the next chained command as a git flag", () => {
  const s = session();
  s.ran('git commit -q -m "chore: add the icon" && git log -1 && sed -n 1,30p CHANGELOG.md');
  s.ran("git push origin main; ls -f");
  s.ran("git reset HEAD notes.md | grep -- --hard");
  assert.equal(s.stop(report("committed the fix")), null);
});

test("still flags a guarded flag on a chained git command", () => {
  const s = session();
  s.ran("cd repo && git commit -n -m wip && git status");
  assert.match(s.stop(report("done")).reason, /--no-verify/);
});

test("does not read what follows a config read as its value", () => {
  const s = session();
  s.ran("git config --global user.name\ngit config --global user.email\ngh pr list");
  s.ran("git config user.name && git config user.email");
  s.ran("git config user.name | head -1");
  s.ran("git config user.email 2>/dev/null");
  assert.equal(s.stop(report("committed the fix")), null);
});

test("blocks a server the session started and never stopped", () => {
  const s = session();
  s.ran("cd web && npm run dev");
  s.ran("npm test");
  const result = s.stop(report("`npm test` (42 passed)"));
  assert.equal(result.decision, "block");
  assert.match(result.reason, /started `cd web && npm run dev`/);
  assert.match(result.reason, /Left running/);
});

test("lets the agent stop once a later command stopped the server", () => {
  for (const stop of ["kill %1", "npx vite --port 5173 & sleep 3; curl -s localhost:5173; kill $!", "npx kill-port 3000", "Stop-Process -Id 4242", "taskkill /PID 4242 /F", "pkill -f 'next start'"]) {
    const s = session();
    s.ran("npx next start -p 3100");
    s.ran(stop);
    assert.equal(s.stop(report("checked the page")), null, stop);
  }
});

test("accepts a server the report lists as left running, and flags a new one later", () => {
  const s = session();
  s.ran("npx wrangler dev --port 8787");
  assert.equal(s.stop(report("checked the worker\n**Left running:** wrangler dev on localhost:8787, as you asked")), null);
  assert.equal(s.stop(report("next task done")), null);
  s.ran("npx astro dev --port 4391");
  assert.match(s.stop(report("next task done")).reason, /astro dev/);
});

test("does not read the Left running section as verified claims", () => {
  const s = session();
  s.ran("npm test");
  s.ran("npm run dev");
  const message = report("`npm test` (42 passed)\n**Left running:** `npm run dev` on localhost:3000, stop with `npx kill-port 3000`");
  assert.equal(s.stop(message), null);
});

test("does not mistake builds, tests or config files for servers", () => {
  const s = session();
  for (const command of ["npm run build", "npx vite build", "npx vitest run", "cat vite.config.ts", "npm test", "next build", "npm run start:check"]) s.ran(command);
  assert.equal(s.stop(report("checked the build")), null);
});

test("still flags a config write in a multi-line command", () => {
  const s = session();
  s.ran('cd repo\ngit config --global user.email "x@y.z"\ngit status');
  assert.match(s.stop(report("done")).reason, /changed Git config/);
});
