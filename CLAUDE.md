# CLAUDE.md — Privacy Router (Chrome extension)

Working title: **Privacy Router**. Entry for **#BuildHybridAI 2026** (Devpost). Deadline: **Mon Nov 30, 2026, 2:00 PM PT** (= 22:00 UTC). Target: submit by end of Nov 29 and keep Nov 30 as buffer.

## What this is
A Chrome (Manifest V3) extension that sits in front of cloud AI. Personal financial data is detected and masked **on-device**, only the sanitized text goes to the cloud model, and the real values are restored **locally** in the answer. A ledger shows the user what stayed on the device and what left it.

- Phase 1: **side-panel private chat** (the main MVP, where hybrid inference is demonstrated).
- Phase 2: **guard** for chatgpt.com, claude.ai and gemini.google.com (redact before the user submits).
- Later (after the extension is done): Android / iOS companion. Do NOT start this early.

Full detail: `docs/`. Start with `docs/02-SYSTEM-DESIGN.md`; task order in `docs/05-TASKS.md`.

## Hard rules (never break these)
1. **Raw user text never goes to a cloud model.** Redaction runs with `InferenceMode.ONLY_ON_DEVICE` (it throws instead of falling back to cloud). Only sanitized text may be sent with `PREFER_ON_DEVICE`, `PREFER_IN_CLOUD` or `ONLY_IN_CLOUD`.
2. If Gemini Nano is unavailable, fall back to the **local rule-based detector only**, mark the result "reduced confidence", and make the user review. Never fall back to cloud for raw text.
3. **All AI inference goes through Firebase AI Logic** (hackathon requirement). Do not call another provider. A direct `LanguageModel` call is allowed only for availability checks and pre-download.
4. **No real personal data anywhere**: not in tests, fixtures, logs, screenshots, the repo or the demo video. Use synthetic data only.
5. The vault (placeholder to real value map) lives **in memory or `chrome.storage.session` only**. Never `chrome.storage.local`, never Firestore, never logged.
6. No secrets in the repo. The Firebase web config is not secret, but API keys with extra privileges, service accounts and `.env` files must be git-ignored.
7. No remote code, no analytics or telemetry on content, host permissions limited to what the guard needs (see design doc).

## Do not hallucinate
- If an API, selector, flag or version isn't confirmed in `docs/08-VERIFY-LIST.md` as VERIFIED, treat it as unknown. Check the official docs or test it in the real browser, then update that file.
- Mark guesses as `TO VERIFY`. Don't write code that depends on an unverified assumption without a spike first (see `docs/05-TASKS.md`, Phase 0).
- When something in the Devpost rules matters, re-read `docs/07-DEMO-AND-SUBMISSION.md` (copied from the official page).

## Stack (see `docs/04-DECISIONS.md` for why)
TypeScript (strict), Vite multi-entry build, React 18 for side panel and options, plain CSS, Vitest for unit tests, Playwright for end-to-end tests. Firebase JS SDK `firebase/ai` v12.5.0+ (required for hybrid on-device inference). Firebase products used: AI Logic, App Check (debug token allowed), Remote Config, Auth (anonymous by default). Firestore is optional and may only hold non-sensitive public rule packs.

## Layout (planned; created during scaffolding)
```
src/
  core/        # pure logic, no chrome.* APIs: detectors, chunker, vault, restorer, policy
  ai/          # Firebase AI Logic wrapper: redactor (ON_DEVICE), responder (hybrid), availability
  extension/   # background worker, side panel, content scripts, site adapters, messaging
  ui/          # React components
  shared/      # types, constants, message schemas
tests/ fixtures/ (synthetic only)   docs/
```

## Commands
Not created yet. Fill in after scaffolding (T-0.2): install, dev build, production build, unit tests, e2e tests, lint/typecheck. Don't invent commands before they exist.

## Working agreements
- Keep `src/core/` free of `chrome.*` and Firebase imports so it is unit-testable in Node.
- Every PR-sized change: typecheck + unit tests pass. Run the privacy leak test (`docs/06-TEST-AND-EVAL-PLAN.md`, test L-1) before declaring any pipeline change done.
- Update `docs/05-TASKS.md` checkboxes as work completes; record surprises in `docs/08-VERIFY-LIST.md`.
- Git: commit only when asked. Commit messages end with the attribution line the environment specifies.
- Build only what is in scope. Cut scope before cutting the privacy guarantee or the demo quality.

## Definition of done for the hackathon
Everything in the checklist in `docs/07-DEMO-AND-SUBMISSION.md` is ticked, including the public repo with a visible open-source license, a runtime Firebase AI Logic call in code, App Check, a public YouTube video of 3 minutes or less showing the extension working in Chrome, and a text description.
