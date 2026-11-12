// Packages every skill as an upload-ready .zip for the Claude app (Settings > Skills > Add).
// Each zip holds the skill folder at its root: <name>.zip contains <name>/SKILL.md and the
// folder's other files. Skills whose frontmatter the app would reject are reported and skipped.
//
//   node scripts/package-claude.mjs    writes dist/claude-skills/<name>.zip

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { deflateRawSync } from "node:zlib";
import { root, read } from "./build.mjs";

export const outDir = join(root, "dist", "claude-skills");

// Files and folders that never belong in an upload.
const junk = /^(\.DS_Store|__MACOSX|Thumbs\.db|desktop\.ini|\.git|node_modules|\._.*|.*~|.*\.swp)$/i;

// Top-level "key: value" scalars of a YAML frontmatter block, as in validate.mjs.
export function frontmatter(text) {
  const match = text.replace(/\r\n/g, "\n").match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const data = {};
  for (const line of match[1].split("\n")) {
    const pair = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (pair) data[pair[1]] = pair[2].replace(/^["']|["']$/g, "");
  }
  return data;
}

// The Claude app's upload rules. Returns the problems found, empty when the skill is fine.
export function check(dir, data) {
  if (!data) return ["missing YAML frontmatter"];
  const problems = [];
  const { name = "", description = "" } = data;
  if (name !== dir) problems.push(`name "${name}" must match its folder "${dir}"`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) problems.push(`name "${name}" must be kebab-case`);
  if (name.length > 64) problems.push(`name is ${name.length} characters (at most 64)`);
  if (/claude|anthropic/i.test(name)) problems.push('name must not contain "claude" or "anthropic"');
  if (!description) problems.push("description is missing");
  if (description.length > 1024) problems.push(`description is ${description.length} characters (at most 1024)`);
  if (/[<>]/.test(description)) problems.push("description must not contain < or >");
  return problems;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// A zip archive of [path, Buffer | null] entries; null marks a directory. Timestamps are fixed
// (1980-01-01) so the same files always give the same bytes.
export function zip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [path, content] of entries) {
    const name = Buffer.from(path, "utf8");
    const data = content ?? Buffer.alloc(0);
    const deflated = content ? deflateRawSync(data) : data;
    const method = content && deflated.length < data.length ? 8 : 0;
    const stored = method ? deflated : data;
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10); // time
    local.writeUInt16LE(0x21, 12); // date: 1980-01-01
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(stored.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, stored);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x031e, 4); // made by: Unix, so the permissions below apply
    local.copy(central, 6, 4, 26);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE((content ? 0o100644 : 0o040755) * 0x10000 + (content ? 0 : 0x10), 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);

    offset += local.length + name.length + stored.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

// The skill folder's entries, folder first, sorted, junk left out.
function entries(dir, prefix) {
  const result = [[`${prefix}/`, null]];
  for (const entry of readdirSync(dir).sort()) {
    if (junk.test(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) result.push(...entries(full, `${prefix}/${entry}`));
    else result.push([`${prefix}/${entry}`, readFileSync(full)]);
  }
  return result;
}

function main() {
  const skills = readdirSync(join(root, "skills"))
    .filter((dir) => existsSync(join(root, "skills", dir, "SKILL.md")))
    .sort();
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const skipped = [];
  for (const dir of skills) {
    const problems = check(dir, frontmatter(read(`skills/${dir}/SKILL.md`)));
    if (problems.length) {
      skipped.push(dir);
      console.error(`x skills/${dir}: skipped\n${problems.map((p) => `    ${p}`).join("\n")}`);
      continue;
    }
    writeFileSync(join(outDir, `${dir}.zip`), zip(entries(join(root, "skills", dir), dir)));
    console.log(`  dist/claude-skills/${dir}.zip`);
  }

  console.log(`\n${skills.length - skipped.length} of ${skills.length} skills packaged.`);
  if (skipped.length) {
    console.error(`${skipped.length} skipped: ${skipped.join(", ")}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
