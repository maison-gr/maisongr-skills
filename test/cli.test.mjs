import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createUi } from "../cli/ui.mjs";

const cli = fileURLToPath(new URL("../cli/maisongr-skills.mjs", import.meta.url));
const skillCount = readdirSync(fileURLToPath(new URL("../skills", import.meta.url))).length;

function project() {
  return mkdtempSync(join(tmpdir(), "maisongr-test-"));
}

function run(args, { cwd, home } = {}) {
  // Plain text whatever runs the tests: GitHub Actions turns colour on for its own log.
  const env = { ...process.env, NO_COLOR: "1" };
  delete env.FORCE_COLOR;
  if (home) Object.assign(env, { HOME: home, USERPROFILE: home });
  const result = spawnSync(process.execPath, [cli, ...args], { cwd, env, encoding: "utf8" });
  return { code: result.status, out: result.stdout, err: result.stderr };
}

const read = (...parts) => readFileSync(join(...parts), "utf8");

// The closing line: milliseconds under a second, then seconds with one decimal ("Done 286ms", "Done 1.8s").
const DONE_LINE = /\n {2}[✓+] Done (\d+ms|\d+\.\d+s)\n/;

test("the closing line matches the pattern however long the run took", () => {
  for (const ms of [286, 1834, 12000]) {
    let out = "";
    createUi((s) => (out += s), { color: false, unicode: true }).done(ms);
    assert.match(`\n${out}`, DONE_LINE, `${ms}ms`);
  }
});

const skills = (...parts) => readdirSync(join(...parts)).filter((name) => name.startsWith("maisongr-"));
const count = (text, needle) => text.split(needle).length - 1;

test("init installs principles, skills and subagents for all agents", () => {
  const dir = project();
  const { code } = run([], { cwd: dir });
  assert.equal(code, 0);
  assert.equal(skills(dir, ".agents", "skills").length, skillCount);
  assert.equal(skills(dir, ".claude", "skills").length, skillCount);
  assert.equal(readdirSync(join(dir, ".claude", "agents")).length, 3);
  assert.ok(existsSync(join(dir, ".agents", "skills", "maisongr-debugging", "SKILL.md")));
  assert.match(read(dir, "AGENTS.md"), /# Maison GR Engineering Principles/);
  assert.equal(read(dir, "CLAUDE.md"), "@AGENTS.md\n");
  assert.deepEqual(JSON.parse(read(dir, ".gemini", "settings.json")).context.fileName, ["AGENTS.md", "GEMINI.md"]);
});

test("running init twice changes nothing the second time", () => {
  const dir = project();
  run(["init"], { cwd: dir });
  const first = [read(dir, "AGENTS.md"), read(dir, "CLAUDE.md"), read(dir, ".gemini", "settings.json")];
  const { code, out } = run(["update"], { cwd: dir });
  assert.equal(code, 0);
  assert.deepEqual([read(dir, "AGENTS.md"), read(dir, "CLAUDE.md"), read(dir, ".gemini", "settings.json")], first);
  assert.equal(count(read(dir, "AGENTS.md"), "maisongr:start"), 1);
  assert.match(out, /unchanged\s+AGENTS\.md/);
});

test("existing AGENTS.md and CLAUDE.md keep their content", () => {
  const dir = project();
  writeFileSync(join(dir, "AGENTS.md"), "# My project\r\n\r\nRun npm test.\r\n");
  writeFileSync(join(dir, "CLAUDE.md"), "Use pnpm.");
  mkdirSync(join(dir, ".gemini"));
  writeFileSync(join(dir, ".gemini", "settings.json"), JSON.stringify({ theme: "Dracula", context: { fileName: "CONTEXT.md" } }));

  run([], { cwd: dir });
  run([], { cwd: dir });

  const agents = read(dir, "AGENTS.md");
  assert.ok(agents.indexOf("Maison GR Engineering Principles") < agents.indexOf("# My project"));
  assert.match(agents, /Run npm test\./);
  assert.equal(count(agents, "maisongr:start"), 1);
  assert.ok(!/[^\r]\n/.test(agents), "keeps the file's CRLF line endings");
  assert.equal(read(dir, "CLAUDE.md"), "Use pnpm.\n\n@AGENTS.md\n");
  const settings = JSON.parse(read(dir, ".gemini", "settings.json"));
  assert.equal(settings.theme, "Dracula");
  assert.deepEqual(settings.context.fileName, ["AGENTS.md", "CONTEXT.md"]);
});

test("--agent limits what is installed", () => {
  const dir = project();
  const { code } = run(["--agent", "codex"], { cwd: dir });
  assert.equal(code, 0);
  assert.equal(skills(dir, ".agents", "skills").length, skillCount);
  assert.ok(existsSync(join(dir, "AGENTS.md")));
  for (const path of [".claude", "CLAUDE.md", ".gemini"]) assert.ok(!existsSync(join(dir, path)), `${path} not created`);

  const claudeOnly = project();
  run(["--agent", "claude"], { cwd: claudeOnly });
  assert.ok(!existsSync(join(claudeOnly, ".agents")));
  assert.equal(skills(claudeOnly, ".claude", "skills").length, skillCount);
});

test("--dry-run writes nothing", () => {
  const dir = project();
  const { code, out } = run(["--dry-run"], { cwd: dir });
  assert.equal(code, 0);
  assert.match(out, /would create\s+AGENTS\.md/);
  assert.deepEqual(readdirSync(dir), []);
});

test("remove deletes only what was installed", () => {
  const dir = project();
  writeFileSync(join(dir, "AGENTS.md"), "# My project\n");
  mkdirSync(join(dir, ".agents", "skills", "my-own-skill"), { recursive: true });
  run([], { cwd: dir });

  const { code } = run(["remove"], { cwd: dir });
  assert.equal(code, 0);
  assert.equal(read(dir, "AGENTS.md"), "# My project\n");
  assert.deepEqual(readdirSync(join(dir, ".agents", "skills")), ["my-own-skill"]);
  assert.deepEqual(skills(dir, ".claude", "skills"), []);
  assert.deepEqual(readdirSync(join(dir, ".claude", "agents")), []);

  const fresh = project();
  run([], { cwd: fresh });
  run(["remove"], { cwd: fresh });
  assert.ok(!existsSync(join(fresh, "AGENTS.md")), "AGENTS.md created by the tool is deleted");
});

test("--global installs into the home directory", () => {
  const home = project();
  const { code, out } = run(["--global"], { cwd: project(), home });
  assert.equal(code, 0);
  assert.equal(skills(home, ".agents", "skills").length, skillCount);
  assert.equal(skills(home, ".claude", "skills").length, skillCount);
  assert.match(read(home, ".claude", "AGENTS.md"), /maisongr:start/);
  assert.equal(read(home, ".claude", "CLAUDE.md"), "@AGENTS.md\n");
  assert.match(read(home, ".codex", "AGENTS.md"), /maisongr:start/);
  assert.match(read(home, ".gemini", "GEMINI.md"), /maisongr:start/);
  assert.match(out, /Cursor and GitHub Copilot have no user-wide instruction file/);
});

test("list, help and version", () => {
  const listed = run(["list"]);
  assert.equal(listed.code, 0);
  assert.equal(listed.out.split("\n").filter((line) => /^ {4}maisongr-/.test(line)).length, skillCount);
  assert.match(run(["--help"]).out, /Usage:/);
  const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(run(["--version"]).out.trim(), version);
});

test("invalid input fails with a clear message", () => {
  for (const args of [["deploy"], ["--agent", "vim"], ["--bogus"], ["--global", "--dir", "x"], ["--dir", join(project(), "missing")]]) {
    const { code, err } = run(args, { cwd: project() });
    assert.equal(code, 1, `exit code for ${args.join(" ")}`);
    assert.match(err, /^\n {2}[✗x] [A-Z-]/, `message for ${args.join(" ")}`);
    assert.match(err, /--help lists every command and option/, `the way out, for ${args.join(" ")}`);
  }
});

// What a person sees: every run ends in a success, a warning or an error they can act on.

test("success: a title, what changed file by file, the next steps and Done", () => {
  const { code, out, err } = run([], { cwd: project() });
  assert.equal(code, 0);
  assert.equal(err, "");
  assert.match(out, /^\n {2}maisongr-skills \d+\.\d+\.\d+ · init\n/);
  assert.match(out, /\n {2}Installed\n/);
  assert.match(out, /\n {2}[✓+] created +AGENTS\.md\n/);
  assert.match(out, /\n {2}Next\n {2}[→>] Restart your agent/);
  assert.match(out, /\n {2}You can also\n/);
  for (const command of ["list", "--global", "remove", "--help"]) assert.match(out, new RegExp(`[→>] npx maisongr-skills ${command}`), command);
  assert.match(out, DONE_LINE);
});

test("nothing to change is shown quietly, not as a change", () => {
  const dir = project();
  run([], { cwd: dir });
  const { out } = run([], { cwd: dir });
  assert.match(out, /\n {2}[·-] unchanged +AGENTS\.md\n/);
  assert.match(out, /[·-] unchanged +\.claude\/skills\/maisongr-\* +\d+ skills/);
  assert.match(out, /[·-] unchanged +\.claude\/agents\/maisongr-\*\.md +3 subagents/);
  assert.doesNotMatch(out, /updated/, "nothing is reported as updated when nothing changed");

  writeFileSync(join(dir, ".claude", "skills", "maisongr-debugging", "SKILL.md"), "edited");
  const changed = run([], { cwd: dir }).out;
  assert.match(changed, /[✓+] updated +\.claude\/skills\/maisongr-\* +1 of \d+ skills/);
  assert.match(read(dir, ".claude", "skills", "maisongr-debugging", "SKILL.md"), /^---/);
});

test("warning: a file it cannot change is marked and counted, and the run still succeeds", () => {
  const dir = project();
  mkdirSync(join(dir, ".gemini"));
  writeFileSync(join(dir, ".gemini", "settings.json"), "{ // a comment\n}");
  const { code, out } = run([], { cwd: dir });
  assert.equal(code, 0);
  assert.match(out, /\n {2}! skipped +\.gemini\/settings\.json +not plain JSON/);
  assert.match(out, /Done · 1 to look at above/);
});

test("dry run: says nothing is written, and how to make the change", () => {
  const { out } = run(["--dry-run", "--agent", "codex"], { cwd: project() });
  assert.match(out, /dry run: nothing is written/);
  assert.match(out, /Would change/);
  assert.match(out, /Run it without --dry-run to make these changes: npx maisongr-skills --agent codex/);
  assert.match(out, /Dry run done: nothing was written/);
});

test("remove with nothing installed says so", () => {
  const { code, out } = run(["remove"], { cwd: project() });
  assert.equal(code, 0);
  assert.match(out, /Nothing to remove/);
});

test("errors suggest what was meant", () => {
  assert.match(run(["remvoe"], { cwd: project() }).err, /Unknown command "remvoe"\.\n {4}Did you mean remove\?/);
  assert.match(run(["--agent", "cluade"], { cwd: project() }).err, /Unknown agent "cluade"\.\n {4}Did you mean claude\?/);
  assert.match(run(["--dry-rnu"], { cwd: project() }).err, /Unknown option --dry-rnu\.\n {4}Did you mean --dry-run\?/);
});

test("colour on a terminal only: off when piped, NO_COLOR or --no-color, on with FORCE_COLOR", () => {
  const ESC = "\u001b[";
  const env = (extra) => {
    const e = { ...process.env, ...extra };
    for (const k of ["FORCE_COLOR", "NO_COLOR", "GITHUB_ACTIONS"]) if (!(k in extra)) delete e[k];
    return e;
  };
  const plainRun = spawnSync(process.execPath, [cli, "list"], { env: env({}), encoding: "utf8" });
  assert.ok(!plainRun.stdout.includes(ESC), "a pipe gets plain text");
  const forced = spawnSync(process.execPath, [cli, "list"], { env: env({ FORCE_COLOR: "1" }), encoding: "utf8" });
  assert.ok(forced.stdout.includes(ESC), "FORCE_COLOR colours it");
  const off = spawnSync(process.execPath, [cli, "list", "--no-color"], { env: env({ FORCE_COLOR: "1" }), encoding: "utf8" });
  assert.ok(!off.stdout.includes(ESC), "--no-color wins");
});

test("an unexpected failure says it is a bug, where to report it, and exits 2", () => {
  const dir = project();
  mkdirSync(join(dir, "AGENTS.md")); // a folder where the file should be
  const { code, err } = run(["--agent", "codex"], { cwd: dir });
  assert.equal(code, 2);
  assert.match(err, /stopped on an unexpected error/);
  assert.match(err, /^ {4}https:\/\/github\.com\/maison-gr\/maisongr-skills\/issues$/m, "says where to report it, on its own line");
});
