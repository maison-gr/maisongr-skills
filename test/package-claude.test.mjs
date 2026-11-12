import { test } from "node:test";
import assert from "node:assert/strict";
import { inflateRawSync } from "node:zlib";
import { check, frontmatter, zip } from "../scripts/package-claude.mjs";

// Reads a zip's central directory back into { path: content | null }.
function unzip(buffer) {
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let at = buffer.readUInt32LE(end + 16);
  const files = {};
  for (let i = 0; i < buffer.readUInt16LE(end + 10); i++) {
    const method = buffer.readUInt16LE(at + 10);
    const size = buffer.readUInt32LE(at + 20);
    const nameLength = buffer.readUInt16LE(at + 28);
    const name = buffer.toString("utf8", at + 46, at + 46 + nameLength);
    const local = buffer.readUInt32LE(at + 42);
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const data = buffer.subarray(start, start + size);
    files[name] = name.endsWith("/") ? null : (method === 8 ? inflateRawSync(data) : data).toString("utf8");
    at += 46 + nameLength + buffer.readUInt16LE(at + 30) + buffer.readUInt16LE(at + 32);
  }
  return files;
}

test("accepts a skill the Claude app will take", () => {
  const data = frontmatter("---\nname: maisongr-git\ndescription: Everyday version control.\n---\n# Git\n");
  assert.deepEqual(check("maisongr-git", data), []);
});

test("rejects names and descriptions the Claude app refuses", () => {
  const problems = (dir, name, description) => check(dir, { name, description }).join("\n");
  assert.match(problems("maisongr-git", "maisongr-gitx", "ok"), /must match its folder/);
  assert.match(problems("Maisongr_Git", "Maisongr_Git", "ok"), /kebab-case/);
  assert.match(problems("a".repeat(65), "a".repeat(65), "ok"), /at most 64/);
  assert.match(problems("claude-helper", "claude-helper", "ok"), /"claude" or "anthropic"/);
  assert.match(problems("x", "x", ""), /description is missing/);
  assert.match(problems("x", "x", "d".repeat(1025)), /at most 1024/);
  assert.match(problems("x", "x", "Use for <div> layouts"), /< or >/);
  assert.deepEqual(check("x", null), ["missing YAML frontmatter"]);
});

test("zips the skill folder at the archive root, contents intact", () => {
  const long = "Line of a skill body.\n".repeat(200);
  const files = unzip(
    zip([
      ["maisongr-git/", null],
      ["maisongr-git/SKILL.md", Buffer.from(long)],
      ["maisongr-git/references/a.md", Buffer.from("a")],
    ]),
  );
  assert.deepEqual(Object.keys(files), ["maisongr-git/", "maisongr-git/SKILL.md", "maisongr-git/references/a.md"]);
  assert.equal(files["maisongr-git/SKILL.md"], long);
  assert.equal(files["maisongr-git/references/a.md"], "a");
});
