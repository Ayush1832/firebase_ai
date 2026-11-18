# CLAUDE.md — Privacy Router (Chrome extension)

Working title: **Privacy Router**. Entry for **#BuildHybridAI 2026** (Devpost), platform **Web/Chrome (extension)**. Deadline: **Mon Nov 30, 2026, 2:00 PM PT** (= 22:00 UTC), fixed; commits after it are not evaluated. Target: submit by end of Nov 29, Nov 30 is buffer. Team: two members.

## What this is
A Chrome (Manifest V3) extension that sits in front of cloud AI. Personal financial data is detected and masked **on-device**, only the sanitized text goes to the cloud model (with consent), and the real values are restored **locally** in the answer. A ledger shows the user what stayed on the device and what left it.

- Phase 1: **side-panel private chat** (the main MVP, where hybrid inference is demonstrated).
- Phase 2: **guard** for chatgpt.com, claude.ai and gemini.google.com (redact before the user submits).
- Later (after the extension is done, in a **new repo** after the submission tag): Android / iOS companion. Do NOT start this early.

## Read first
`docs/02-SYSTEM-DESIGN.md` (architecture), `docs/05-TASKS.md` (task order), `docs/08-VERIFY-LIST.md` (what is verified). Specs: `09` detection, `10` AI calls, `11` UX, `12` extension mechanics, `13` setup, `14` spikes, `15` risks, `16` Devpost draft. Rules of the hackathon: `07`.

## Hard rules (never break these)
1. **Raw user text never goes to a cloud model.** Redaction runs with `InferenceMode.ONLY_ON_DEVICE` on a model instance with **no cloud params**. Only sanitized text (the branded `SanitizedText` produced by the safety gate) may be passed to a responder using `PREFER_ON_DEVICE` or `ONLY_IN_CLOUD`. Every redactor response must report `inferenceSource === 'ON_DEVICE'` or be discarded.
2. If Gemini Nano is unavailable, fall back to the **local rule-based detector only**, mark the result "reduced confidence", and make the user review. Never fall back to cloud for raw text.
3. **Cloud answers require recorded user consent** (18+, not in EEA/CH/UK, free-tier data note) and respect the Remote Config kill switch. No consent means zero cloud requests (ADR-013).
4. **All AI inference goes through Firebase AI Logic** (hackathon requirement). Do not call another model provider. A direct `LanguageModel` call is allowed only for availability checks.
5. **Never call the redactor unless the on-device state is `ready`.** With `ONLY_ON_DEVICE` a request waits for an in-progress model download (minutes). Use the state machine in doc 10 §2.
6. **No real personal data anywhere**: not in tests, fixtures, logs, screenshots, the repo, the Devpost form or the demo video. Synthetic data only.
7. The vault (placeholder to real value) lives **in memory or `chrome.storage.session` only**. Never `chrome.storage.local`, `storage.sync`, Firestore or logs.
8. **No secrets in the repo, the built bundle, the Devpost form or the testing instructions.** App Check debug tokens, service-account keys and `.env` files are git-ignored; tokens are pasted only into the options page at runtime. The Firebase web config is an identifier, not a secret, but still comes from `.env.local`.
9. No remote code, no analytics or telemetry, no logging of content. Permissions: `sidePanel`, `storage`, content-script matches for the three sites only, unless justified in doc 12.
10. **No third-party logos or trademarks in the demo video or images** (ADR-021). Use a local mock page for the guard scene.
11. Be honest in all copy: never claim "100% private" or "guaranteed". Mention that detection is imperfect and state the free-tier note wherever the cloud route is described.
12. After the submission tag (`submission-v1`), do not push to this repo except defect fixes before the deadline; new work goes in a new repo (ADR-011, ADR-022).

## Do not hallucinate
- If an API, selector, flag or version isn't marked **[V]** in `docs/08-VERIFY-LIST.md`, treat it as unknown. Check the official docs or test it in the real browser, then update that file. Mark guesses **[TV]**; general-knowledge items **[K]** are not verified.
- Don't write code that depends on an unverified assumption without the matching spike first (`docs/14-SPIKE-PLAYBOOKS.md`).
- Don't put measured numbers, features or results in README/Devpost text before they exist.
- When something in the Devpost rules matters, re-read `docs/07-DEMO-AND-SUBMISSION.md` (built from the Official Rules, FAQs and Resources pages read on Nov 18).

## Key verified facts to keep in mind (sources in doc 08)
- Firebase AI Logic JS SDK v12.5.0+ for on-device; default cloud model `gemini-3.5-flash-lite` from v13.0.0 (we set the model explicitly). Chrome desktop 139+. Modes: `PREFER_ON_DEVICE`, `ONLY_ON_DEVICE`, `PREFER_IN_CLOUD`, `ONLY_IN_CLOUD`; `result.response.inferenceSource` is `ON_DEVICE` or `IN_CLOUD`.
- `initializeDeviceModel()` must be called after or on a user interaction. On-device is single-turn text only, about 9,216 tokens, structured output supported (`onDeviceParams.promptOptions.responseConstraint`), no tools, no chat, token counting unreliable.
- The Prompt API is documented for extensions but is **not available in Web Workers**; so the engine lives in the side panel page, not the service worker. Offscreen docs cannot be focused.
- App Check is auto-enforced for AI Logic (since Nov 2, 2026); debug tokens are accepted in submissions; never commit them.
- Free Gemini API tier: Google may use content to improve products and human reviewers may read it; 18+ only; Paid Services only for EEA/CH/UK users.
- Chrome flags: both `#prompt-api-for-gemini-nano-multimodal-input` and "Gemma 4 for Built-in AI" are mentioned by different sources; check both (TV-7). About 22 GB free disk needed.

## Stack (see `docs/04-DECISIONS.md` for why)
TypeScript (strict), Vite multi-entry build with a hand-written `manifest.json`, React 18 for side panel and options, plain CSS, Vitest for unit tests, Playwright for end-to-end tests (Chromium with a fake AI; real Nano checked manually in Google Chrome). Firebase JS SDK `firebase/ai`. Firebase products: AI Logic, App Check (debug provider), Remote Config, Auth (anonymous). Firestore optional, public rule packs only.

## Layout (planned; created during scaffolding)
```
src/
  core/        # pure logic, no chrome.*, no firebase, no react: normalize, detectors, chunker, merge, vault, gate, restorer, policy
  ai/          # Firebase AI Logic wrapper: three model instances, availability, redactOnDevice, answer
  extension/   # background worker, side panel, options, guard content script + site adapters, firebase init
  ui/          # React components, tokens.css
  shared/      # types, constants, message schemas, labels
tests/ fixtures/ scripts/ (synthetic only)   docs/   spikes/ (throwaway, not shipped)
```

## Commands
- Install: `npm install`
- Dev build (watch): `npm run dev`
- Production build: `npm run build` (outputs unpacked extension to `dist/`)
- Unit tests: `npm test` (or `npm run test:watch`)
- Type check: `npm run typecheck`
- Lint: `npm run lint`

## Working agreements
- Keep `src/core/` free of `chrome.*`, Firebase and React imports so it is unit-testable in Node.
- Every PR-sized change: typecheck, lint and unit tests pass. Run the leak test (`docs/06-TEST-AND-EVAL-PLAN.md`, L-1) before declaring any pipeline change done.
- Update `docs/05-TASKS.md` checkboxes as work completes; record spike results and surprises in `docs/08-VERIFY-LIST.md` and ADRs in `docs/04-DECISIONS.md`.
- Git: commit only when asked. Commit messages end with the attribution line the environment specifies. Never commit `.env*`, tokens, keys or `dist/`.
- Build only what is in scope. Cut scope (order in `docs/05-TASKS.md`) before cutting the privacy guarantee, the gate, the review step, the consent gate or the demo quality.
- The Devpost project is a draft; update it via `docs/16-DEVPOST-DRAFT.md`. Attestations and the final Submit are for the team members to do themselves.

## Definition of done for the hackathon
Everything in the checklist in `docs/07-DEMO-AND-SUBMISSION.md` §3 is ticked, including: public repo with a visible open-source license, a runtime Firebase AI Logic call in code, App Check, a public YouTube video of 3 minutes or less showing the extension working in Chrome (no third-party logos), a text description, a testable build with instructions (no secrets), every team member's attestations, and a submission confirmation received before the deadline.
