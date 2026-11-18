# 05 — Task Plan

Today: Wed **Nov 18**. Deadline: Mon **Nov 30, 2:00 PM PT (22:00 UTC)**. Plan to submit by end of Nov 29; Nov 30 is buffer only.
Check off items as they complete. `[U]` = needs the user (account/device access). Each task has acceptance criteria (AC).

## Schedule at a glance
| Days | Phase | Outcome |
|---|---|---|
| Nov 18–19 | 0. Setup and spikes | Risks retired: Nano in extension, Firebase init, App Check |
| Nov 20–22 | 1. Core engine | Detection, masking, vault, gate, restore, tested without a browser |
| Nov 23–25 | 2. Side-panel product | Full chat flow, routing, ledger, review, states |
| Nov 26–27 | 3. Guard | 3 site adapters with preview and confirm |
| Nov 28 | 4. Hardening | Eval run, leak test, accessibility, polish |
| Nov 29 | 5. Submission | Video, description, repo public, submit |
| Nov 30 | Buffer | Fix-ups only, submit well before 22:00 UTC |

**Cut order if behind:** (1) response restore on third-party sites, (2) Firestore, (3) Google sign-in, (4) one of the 3 guard sites, (5) guard entirely. Never cut: gate, leak test, review step, demo quality.

---

## Phase 0 — Setup and risk spikes (Nov 18–19)

- [ ] **T-0.1 [U] Firebase project.** Create project, add Web app, enable AI Logic (Gemini Developer API), enable App Check, enable Remote Config and anonymous Auth. Share the `firebaseConfig`. AC: config object received; AI Logic enabled.
- [ ] **T-0.2 Scaffold repo.** Vite multi-entry TS project, manifest.json (MV3), React side panel stub, Vitest, ESLint, `.gitignore` (env files, debug tokens). Fill the Commands section of CLAUDE.md. AC: `build` produces a loadable unpacked extension showing an empty side panel; tests run.
- [ ] **T-0.3 Add LICENSE (Apache-2.0)** and NOTICE if needed. AC: license detected by GitHub (check after the repo is pushed).
- [ ] **T-0.4 [U] Enable Chrome flag** `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` and relaunch. AC: `await LanguageModel.availability()` in DevTools returns a value.
- [ ] **T-0.5 Spike S-1: Firebase hybrid in an extension side panel.** `getAI` + `getGenerativeModel` with `PREFER_ON_DEVICE`, call `initializeDeviceModel` from a button click, run a tiny prompt, print `inferenceSource`. AC: documented in `08-VERIFY-LIST.md` whether it works in a side panel page, with exact errors if not. (If it fails: try offscreen document, spike S-2.)
- [ ] **T-0.6 Spike S-2: engine host for the guard.** Test from a content script via background: can the side panel or an offscreen document serve requests while the panel is closed? AC: decision recorded in ADR-005.
- [ ] **T-0.7 Spike S-3: App Check in an extension.** Debug-token flow, token registered in console, AI Logic call succeeds with enforcement on. AC: documented steps; no token committed.
- [ ] **T-0.8 Spike S-4: ONLY_ON_DEVICE behavior** when the model is unavailable (confirm it throws and no network request is made). AC: observed in DevTools Network tab, recorded.
- [ ] **T-0.9 Spike S-5: structured JSON output on-device** with a response schema for entity extraction; measure latency and token limits on a 1-page sample. AC: numbers recorded, chunk size chosen.
- [ ] **T-0.10 Spike S-6: model/Remote Config.** Fetch Remote Config from an extension, confirm defaults work offline. AC: recorded.
- [ ] **T-0.11 Confirm quota/model names** from current Firebase docs (cloud model id, SDK version). AC: noted in verify list; no hard-coded guesses.
- [ ] **T-0.12 Decide go/no-go** on side-panel engine based on spikes. AC: ADR-005 updated.

## Phase 1 — Core engine (`src/core`, Nov 20–22)

- [ ] **T-1.1 Types and message schemas** (`Span`, `MaskResult`, `LedgerEntry`, branded `RawText`/`SanitizedText`). AC: typecheck passes.
- [ ] **T-1.2 Deterministic detectors:** email, phone, card (Luhn), IBAN (mod-97), generic account numbers with context keywords, API-key shapes. AC: unit tests with synthetic fixtures; no false pass on invalid checksums.
- [ ] **T-1.3 Locale packs:** US (SSN, routing), IN (PAN, Aadhaar+Verhoeff, IFSC, UPI) — **confirm which packs with the user (Q-3)**. AC: tests per pack.
- [ ] **T-1.4 Custom terms detector.** AC: exact, case-insensitive; tests.
- [ ] **T-1.5 Chunker** with overlap and offset mapping. AC: round-trip test; spans stay correct across chunk joins.
- [ ] **T-1.6 Span merge/overlap resolution.** AC: property-style tests (longest wins, high beats low, rules never removed).
- [ ] **T-1.7 Masker + vault** with stable placeholders per value per conversation; handle pre-existing placeholder-like text (T-11 in threat model). AC: tests.
- [ ] **T-1.8 Safety gate** re-scan; returns `SanitizedText` or a block result. AC: tests including adversarial cases (value split across chunks, unicode lookalike digits, spaced digits).
- [ ] **T-1.9 Restorer** exact + tolerant matching. AC: tests with mangled placeholder variants.
- [ ] **T-1.10 Policy module** (routing decisions from inputs; Remote Config-shaped config with defaults). AC: table-driven tests.
- [ ] **T-1.11 Synthetic personal-finance corpus** (see test plan) with ground-truth labels. AC: ≥ 60 samples, generator script, all fake data.
- [ ] **T-1.12 Eval harness (rules layer)** reporting recall/precision per type. AC: report runs in CI.

## Phase 2 — Side-panel product (Nov 23–25)

- [ ] **T-2.1 AI wrapper (`src/ai`):** `redactOnDevice` (`ONLY_ON_DEVICE`, JSON schema, strict validation, substring-to-offset mapping) and `answer` (sanitized only, mode from policy, `inferenceSource` captured). AC: unit tests with a fake AI; lint rule restricting `getGenerativeModel` to `src/ai/`.
- [ ] **T-2.2 Model availability + download UX** with progress and error states. AC: manual test with model absent and present.
- [ ] **T-2.3 Pipeline orchestrator** (chunk, detect, merge, mask, gate) with cancellation and progress events. AC: integration test with fake AI; rules-only mode path.
- [ ] **T-2.4 Chat UI:** composer, message list, restored answers, streaming if supported **[TV]**. AC: usable end to end with a fake cloud.
- [ ] **T-2.5 Review sheet:** highlights by type, un-mask, add mask by selection, reduced-confidence banner, send button gated by the safety result. AC: keyboard accessible; e2e test.
- [ ] **T-2.6 Ledger drawer** with `ON-DEVICE` / `CLOUD` / `RULES` badges and counts; "Raw text left device: No" only when the gate passed. AC: matches actual calls in leak test.
- [ ] **T-2.7 Routing:** hybrid answer path (policy), manual override toggle, offline handling. AC: toggling airplane mode changes route visibly.
- [ ] **T-2.8 Remote Config + App Check + anonymous Auth wiring** with offline defaults. AC: extension fully works with Remote Config unreachable.
- [ ] **T-2.9 Options page:** entity types, packs, custom terms, strict mode, privacy explainer. AC: persisted settings survive restart.
- [ ] **T-2.10 Onboarding flow** (3 steps) and sample finance text button. AC: new profile reaches a first successful masked chat in under 2 minutes.
- [ ] **T-2.11 Error and empty states** for every failure (model error, network error, gate block, empty input, oversized input). AC: each has a designed message.
- [ ] **T-2.12 Visual design pass** (type scale, spacing, colors, dark mode if cheap). AC: screenshot review.

## Phase 3 — Guard (Nov 26–27)

- [ ] **T-3.1 Guard framework:** adapter interface (`findInput`, `getText`, `setText`, `interceptSubmit`), message bridge to the engine host, preview overlay UI. AC: works on a local test page.
- [ ] **T-3.2 chatgpt.com adapter.** Inspect the live DOM (selectors **[TV]**; rich text editor handling). AC: masked text replaces prompt text and submit proceeds only after confirm.
- [ ] **T-3.3 claude.ai adapter.** Same AC.
- [ ] **T-3.4 gemini.google.com adapter.** Same AC.
- [ ] **T-3.5 Failure behavior:** if an adapter cannot find the input, show "guard inactive on this page" (never fail silently). AC: manual test.
- [ ] **T-3.6 Permissions audit:** host permissions limited to 3 sites. AC: manifest reviewed.
- [ ] **T-3.7 (stretch) Response restore** on third-party sites. AC: only if everything else is done.

## Phase 4 — Hardening (Nov 28)

- [ ] **T-4.1 Leak test L-1** with network spy across the corpus. AC: 0 leaks; test in CI.
- [ ] **T-4.2 Full eval run** (rules, Nano, combined) and fill the results table in the test plan. AC: numbers recorded; known misses listed honestly.
- [ ] **T-4.3 Placeholder survival rate** measured on on-device and cloud answers; adjust format/restore if poor. AC: documented.
- [ ] **T-4.4 Fresh-profile install test** following the README. AC: a clean Chrome profile works.
- [ ] **T-4.5 Accessibility pass** (keyboard, contrast, labels). AC: checklist ticked.
- [ ] **T-4.6 Performance pass** (latency numbers for the video claims). AC: measured.
- [ ] **T-4.7 Dependency and secret scan.** AC: no secrets, no debug tokens in git history.

## Phase 5 — Submission (Nov 29)

- [ ] **T-5.1 README final:** install, setup (Firebase config, flag, App Check debug), architecture diagram, limitations, privacy statement. AC: someone else can run it.
- [ ] **T-5.2 Project description** (Devpost text): how Firebase AI Logic is used, features, value proposition. AC: reviewed against `07-DEMO-AND-SUBMISSION.md`.
- [ ] **T-5.3 Demo video** (≤ 3:00, YouTube public, English, shows the extension in Chrome). Use the script in doc 07. AC: public link works logged out.
- [ ] **T-5.4 Hosted/testable URL** (e.g. Chrome extension zip or unlisted store link, plus a short test guide). **[TV]** what is acceptable. AC: judge can try it.
- [ ] **T-5.5 [U] Make repo public**, license visible in About. AC: verified logged out.
- [ ] **T-5.6 [U] Devpost submission** with platform = Web/Chrome. Submit by end of Nov 29. AC: confirmation received.
- [ ] **T-5.7 Buffer day** Nov 30: re-check everything, re-submit edits if needed before 22:00 UTC.

## Phase 6 — After the extension (not before)
- [ ] **T-6.1** Decide companion app platform (Android needs a supported physical device; the available iPhone lacks Apple Intelligence support). Reuse `src/core`.
