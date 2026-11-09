import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { connect, createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../receipts/receipts.mjs", import.meta.url));

// A session's hooks. Sessions sharing `data` see each other's records, as on one machine.
function session(data = mkdtempSync(join(tmpdir(), "maisongr-receipts-")), id = "test-session") {
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
    data,
    // Claude Code calls "before" just before a command runs, and "record" once it has run.
    before: (command) => hook("before", { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command } }),
    ran: (command) => hook("record", { hook_event_name: "PostToolUse", tool_name: "Bash", tool_input: { command } }),
    end: () => hook("end", { hook_event_name: "SessionEnd", reason: "prompt_input_exit" }),
    start: () => hook("start", { hook_event_name: "SessionStart", source: "startup" }),
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

// A local port with something listening on it, standing in for a dev server.
function listening(port = 0) {
  return new Promise((done) => {
    const server = createServer().listen(port, "127.0.0.1", () =>
      done({ port: server.address().port, close: () => new Promise((closed) => server.close(closed)) }),
    );
  });
}

const answers = (port) =>
  new Promise((done) => {
    const socket = connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      done(true);
    });
    socket.once("error", () => done(false));
  });

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// A free port whose next ten ports are free too, so a test controls everything on them.
async function freePort() {
  for (;;) {
    const { port, close } = await listening();
    await close();
    const range = Array.from({ length: 11 }, (_, i) => port + i);
    if (port + 10 <= 65535 && !(await Promise.all(range.map(answers))).some(Boolean)) return port;
  }
}

// A dev server in its own process, as an agent would start one.
async function serverProcess(port) {
  const child = spawn(process.execPath, ["-e", `require("net").createServer().listen(${port}, "127.0.0.1"); setInterval(() => {}, 1e9)`], {
    stdio: "ignore",
  });
  const exited = new Promise((done) => child.once("exit", () => done(true)));
  for (let i = 0; i < 100 && !(await answers(port)); i++) await sleep(50);
  return {
    pid: child.pid,
    exited: () => Promise.race([exited, sleep(3000).then(() => false)]),
    close: async () => {
      child.kill();
      await Promise.race([exited, sleep(3000)]);
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

test("reads past separators inside a quoted message", () => {
  const s = session();
  s.ran('git commit -m "fix: a; b" --no-verify');
  assert.match(s.stop(report("done")).reason, /--no-verify/);
  const t = session();
  t.ran("git commit -m 'wip | tmp' --amend");
  assert.match(t.stop(report("done")).reason, /rewrote history/);
});

test("does not read a quoted message as a git flag", () => {
  const s = session();
  s.ran('git commit -m "docs: explain --no-verify and --amend"');
  s.ran("git commit -m 'chore: stop using git push --force'");
  s.ran('git commit -m "$(cat <<\'EOF\'\nfix: x\n\nNever use --no-verify.\nEOF\n)"');
  assert.equal(s.stop(report("committed the fix")), null);
});

test("flags a force-push written as a +refspec", () => {
  const s = session();
  s.ran("git push origin +main");
  assert.match(s.stop(report("done")).reason, /force-pushed/);
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

test("lets the agent stop once a later command stopped a server whose port is unknown", () => {
  for (const stop of ["kill %1", "npx kill-port 3000", "Stop-Process -Id 4242", "taskkill /PID 4242 /F", "pkill -f 'npm run dev'"]) {
    const s = session();
    s.ran("npm run dev");
    s.ran(stop);
    assert.equal(s.stop(report("checked the page")), null, stop);
  }
  const s = session();
  s.ran("npm run dev & sleep 3; curl -s localhost:3000; kill $!");
  assert.equal(s.stop(report("checked the page")), null);
});

test("accepts a server the report lists as left running, and flags a new one later", () => {
  const s = session();
  s.ran("npx wrangler tail my-worker");
  assert.equal(s.stop(report("checked the worker\n**Left running:** wrangler tail, as you asked")), null);
  assert.equal(s.stop(report("next task done")), null);
  s.ran("npm run dev");
  assert.match(s.stop(report("next task done")).reason, /npm run dev/);
});

test("lists every server still running, not only the last one", () => {
  const s = session();
  s.ran("npm run dev");
  s.ran("npx wrangler tail my-worker");
  const { reason } = s.stop(report("done"));
  assert.match(reason, /npm run dev/);
  assert.match(reason, /wrangler tail/);
});

test("blocks a server still listening on its port, whatever was run to stop it", async () => {
  const port = await freePort();
  const s = session();
  const command = `npx next start -p ${port}`;
  s.before(command);
  const server = await serverProcess(port);
  try {
    s.ran(command);
    s.ran("kill 4242");
    const result = s.stop(report("checked the page"));
    assert.equal(result.decision, "block");
    assert.match(result.reason, new RegExp(`still listening on localhost:${port}\\b`));
  } finally {
    await server.close();
  }
});

test("never blames the agent for a port that was taken before its command ran", async () => {
  const mine = await listening();
  try {
    const s = session();
    const command = `npx next dev -p ${mine.port}`;
    s.before(command);
    s.ran(command);
    assert.equal(s.stop(report("checked the page")), null);
    s.end();
    assert.equal(await answers(mine.port), true);
  } finally {
    await mine.close();
  }
});

test("finds the agent's server on the next port when its own port was taken", async () => {
  const port = await freePort();
  const mine = await listening(port);
  const s = session();
  const command = `npx vite --port ${port}`;
  s.before(command);
  const moved = await serverProcess(port + 1);
  try {
    s.ran(command);
    const { reason } = s.stop(report("checked the page"));
    assert.match(reason, new RegExp(`still listening on localhost:${port + 1}\\b`));
    assert.doesNotMatch(reason, new RegExp(`localhost:${port}\\b`));
  } finally {
    await moved.close();
    await mine.close();
  }
});

test("does not take 'stopped' for an answer while the server still listens", async () => {
  const port = await freePort();
  const s = session();
  const command = `npx next start -p ${port}`;
  s.before(command);
  const server = await serverProcess(port);
  try {
    s.ran(command);
    assert.equal(s.stop(report("checked the page. I stopped the dev server.")).decision, "block");
    assert.equal(s.stop(report(`checked the page\n**Left running:** next start on localhost:${port}, as you asked`)), null);
  } finally {
    await server.close();
  }
});

test("uses Claude Code's list of background tasks for a server whose port is unknown", () => {
  const s = session();
  s.ran("npm run dev");
  const running = { background_tasks: [{ type: "shell", command: "npm run dev" }] };
  assert.match(s.stop(report("checked the page"), running).reason, /in the background and it is still running/);
  assert.equal(s.stop(report("checked the page. I stopped the server."), running).decision, "block");
  assert.equal(s.stop(report("checked the page"), { background_tasks: [] }), null);
});

test("still checks a detached server the background list can't see", () => {
  const s = session();
  s.ran("npm run dev > dev.log 2>&1");
  assert.equal(s.stop(report("checked the page"), { background_tasks: [] }), null);
  const t = session();
  t.ran("nohup npm run dev > dev.log 2>&1 &");
  assert.match(t.stop(report("checked the page"), { background_tasks: [] }).reason, /nothing in the record stopped it/);
});

test("stops the agent's server when the session ends", async () => {
  const port = await freePort();
  const s = session();
  const command = `npx astro dev --port ${port}`;
  s.before(command);
  const server = await serverProcess(port);
  try {
    s.ran(command);
    assert.equal(s.stop(report("checked the page")).decision, "block");
    s.end();
    assert.equal(await server.exited(), true);
    assert.equal(await answers(port), false);
  } finally {
    await server.close();
  }
});

test("keeps a server left running on purpose, and says so in the next session", async () => {
  const port = await freePort();
  const s = session();
  const command = `npx next dev -p ${port}`;
  s.before(command);
  const server = await serverProcess(port);
  try {
    s.ran(command);
    assert.equal(s.stop(report(`checked the page\n**Left running:** next dev on localhost:${port}, as you asked`)), null);
    s.end();
    assert.equal(await answers(port), true);
    const notice = session(s.data, "next-session").start();
    assert.match(notice, /left running on purpose/);
    assert.match(notice, new RegExp(`localhost:${port}\\b`));
    assert.equal(await answers(port), true);
  } finally {
    await server.close();
  }
});

test("stops what a session that never ended cleanly left behind, when the next one starts", async () => {
  const port = await freePort();
  const s = session();
  const command = `npx wrangler dev --port ${port}`;
  s.before(command);
  const server = await serverProcess(port);
  try {
    s.ran(command);
    s.stop(report("checked the worker"));
    const notice = session(s.data, "next-session").start();
    assert.match(notice, /stopped servers that earlier sessions left running/);
    assert.equal(await server.exited(), true);
    assert.equal(await answers(port), false);
    assert.equal(session(s.data, "third-session").start(), "");
  } finally {
    await server.close();
  }
});

test("leaves the current session's servers alone when it resumes or compacts", async () => {
  const port = await freePort();
  const s = session();
  const command = `npx next dev -p ${port}`;
  s.before(command);
  const server = await serverProcess(port);
  try {
    s.ran(command);
    s.stop(report("checked the page"));
    assert.equal(s.start(), "");
    assert.equal(await answers(port), true);
  } finally {
    await server.close();
  }
});

test("never stops a process that reused the port after the agent's server ended", async () => {
  const port = await freePort();
  const s = session();
  const command = `npx next dev -p ${port}`;
  s.before(command);
  const first = await serverProcess(port);
  s.ran(command);
  s.stop(report("checked the page"));
  await first.close();
  const reused = await serverProcess(port);
  try {
    assert.equal(session(s.data, "next-session").start(), "");
    s.end();
    assert.equal(await answers(port), true);
  } finally {
    await reused.close();
  }
});

test("lets the agent stop when nothing listens on the server's port any more", async () => {
  const server = await listening();
  await server.close();
  const s = session();
  s.ran(`npx astro dev --port ${server.port}`);
  s.ran(`PORT=${server.port} npm start`);
  assert.equal(s.stop(report("checked the page")), null);
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
