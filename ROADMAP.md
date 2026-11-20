# Roadmap

What we plan to add to maisongr-skills, in order. Nothing here is released until it ships in a version (see `CHANGELOG.md`); every release adds 0.0.1 and is published only on the owner's word.

## Next

### 1. `maisongr-mobile-release` (decided 19 Nov 2026, after the Growth Brain work)
A pre-submission skill for App Store and Google Play, written from Apple's and Google's own rules:
- a checklist of the common rejection reasons, each with the guideline, its official source and the fix;
- the two causes that matter most first: a working demo account with a live backend, and a privacy declaration (privacy manifest, Data safety) that matches what the app and every SDK really do;
- Expo / React Native first, then Swift and Kotlin;
- Québec specifics: Law 25, bilingual privacy pages and store listings, Bill 96 (French), CASL for notifications and emails;
- a read-only scanner run before `eas submit` (purpose strings, permissions, privacy manifest, SDKs);
- a dated register of deadlines (EU AI Act, DSA, COPPA, age laws) with official sources, reviewed every quarter.

Inspiration: `mjmirza/app-store-compliance`. Its licence (OpenRoots Agent License 2.3) is not MIT, so nothing from it is copied: our skill is our own writing from primary sources.

### 2. Lessons from `alirezarezvani/claude-skills` (added 19 Nov 2026)
A large MIT-licensed library (hundreds of skills, about 30k stars) for Claude Code and a dozen other coding agents. What to learn from it, to verify before building:
- **Prove that skills load.** It tests whether each skill loads when someone asks in plain words, and publishes the results. Add the same to our evals: a plain-language prompt per skill, the expected skill, and a published pass rate per release.
- **More agents.** It installs into Codex, Gemini CLI, Cursor, Windsurf, Aider, OpenCode and others. We already ship a Claude Code plugin, a Cursor folder and a Gemini extension; check the gaps (Codex plugin, Windsurf, OpenCode) and keep one source with a build step per agent.
- **"Install in one minute"** on the README, per agent, tested in CI.
- **Wider domains** where Maison GR has real practice: product, marketing, compliance (Law 25, CASL, accessibility), finance and pricing, and the company handbook (life cycle, A/B/C autonomy). Only skills we use ourselves and can test.
- Its licence is MIT: ideas and structure may be adapted with attribution where text is reused; prefer our own writing.

## Later
- Release notes generated from the changelog for each agent's marketplace.
