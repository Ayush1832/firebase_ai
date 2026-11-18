# 05 — Task Plan

Today: Wed **Nov 18**. Deadline: Mon **Nov 30, 2:00 PM PT (22:00 UTC)** [V-1]. Plan to submit by end of Nov 29; Nov 30 is buffer only. After the deadline nothing is evaluated [V-2].

Legend: `[x]` done, `[~]` partly done, `[ ]` open. `[U]` needs the project owner (account or device access). `Est` = rough hours for one person (guesses [D], recalibrate after Phase 0). `Dep` = prerequisite tasks. Each task has acceptance criteria (AC). Spikes are described step by step in `14-SPIKE-PLAYBOOKS.md`.

Team: two members registered on Devpost. Suggested default split [D, Q-9]: **Person A** owns `src/core`, `src/ai`, tests, eval; **Person B** owns `src/extension`, `src/ui`, guard, submission media. Both review privacy-critical code.

## Schedule at a glance
| Days | Phase | Outcome | Exit gate |
|---|---|---|---|
| Nov 18–19 | 0. Setup and spikes | Risks retired: Nano in extension, Firebase init, App Check | T-0.12 go/no-go table in doc 14 |
| Nov 20–22 | 1. Core engine | Detection, masking, vault, gate, restore, tested without a browser | corpus eval runs; vectors pass; leak test (fake AI) passes |
| Nov 23–25 | 2. Side-panel product | Full chat flow, routing, consent, ledger, review, states | fresh-profile first chat < 2 min |
| Nov 26–27 | 3. Guard | 3 site adapters with preview and confirm | works on each site or cut |
| Nov 28 | 4. Hardening | Eval run, leak test, accessibility, polish, **feature freeze evening** | all CI green; checklists ticked |
| Nov 29 | 5. Submission | Video, description, repo public, **submit** | Devpost confirmation |
| Nov 30 | Buffer | Fix-ups only, submit well before 22:00 UTC | none |

**Cut order if behind:** (1) response restore on third-party sites, (2) Firestore, (3) Google sign-in, (4) one of the 3 guard sites, (5) guard entirely, (6) ledger export, (7) streaming. **Never cut:** safety gate, leak test, review step, consent gate, demo quality, honest limitations.

---

## Phase 0 — Setup and risk spikes (Nov 18–19)

- [ ] **T-0.1 [U] Firebase project.** Follow `13-SETUP-GUIDE.md` §2: create project, enable AI Logic (Gemini Developer API), register Web app, confirm App Check enforced, enable Remote Config and anonymous Auth. Decide billing (Q-8). Share the `firebaseConfig`. *Est 0.5. AC:* config received; AI Logic enabled.
- [x] **T-0.2 Scaffold repo.** Vite multi-entry TS project, manifest.json (MV3, doc 12 §2), React side panel stub, Vitest, ESLint (restricted imports), `.env.example`. `.gitignore` already exists and covers env files, keys and debug tokens. Pin the Firebase SDK version after reading its changelog (TV-21). Fill the Commands section of CLAUDE.md. *Est 3. Dep T-0.1. AC:* `build` produces a loadable unpacked extension showing an empty side panel; tests and lint run.
- [~] **T-0.3 LICENSE (Apache-2.0).** `LICENSE` committed (`e4f4505`). GitHub's license API reports Apache-2.0 (V-53). Remaining: logged-out visual check of the About section; add NOTICE only if needed. *Est 0.1. AC:* license visible in About, logged out.
- [ ] **T-0.4 [U] Chrome setup.** Do `13-SETUP-GUIDE.md` §3: update Chrome, enable both flag variants (TV-7), relaunch, `await LanguageModel.availability()`, download the model (about 22 GB free needed), check `chrome://on-device-internals`; create a separate Chrome profile (Q-5). *Est 1 (mostly download). AC:* availability is `available`; model name/version recorded.
- [ ] **T-0.4b Spike S-0: Firebase hybrid on localhost.** *Est 1. Dep T-0.1, T-0.4. AC:* three modes work; `inferenceSource` correct (doc 14). **Do this before S-1.**
- [ ] **T-0.5 Spike S-1: Firebase hybrid inside the side panel.** *Est 2. Dep T-0.2, T-0.4b. AC:* documented in doc 08 whether it works, with exact errors if not; CORS/host-permission need recorded; Plan B chosen if it fails.
- [ ] **T-0.6 Spike S-2: engine host for the guard** (+ S-2b `sidePanel.open` from a content-script gesture). *Est 2. Dep T-0.5. AC:* decision recorded in ADR-005.
- [ ] **T-0.7 Spike S-3: App Check in an extension.** *Est 2–3. Dep T-0.5. AC:* documented steps; negative test; no token committed; tester path drafted (ADR-016).
- [ ] **T-0.8 Spike S-4: `ONLY_ON_DEVICE` when unavailable/downloading.** *Est 1. Dep T-0.5. AC:* exception, zero AI network requests, waiting behavior recorded.
- [ ] **T-0.9 Spike S-5: structured JSON output on-device.** Latency, validity, chunk size, token cost of the constraint (TV-4, TV-22), injection cases. *Est 3. Dep T-0.5. AC:* numbers recorded; chunk size chosen; prompt v1 fixed.
- [ ] **T-0.10 Spike S-6: Remote Config from an extension.** *Est 1. AC:* defaults work offline.
- [ ] **T-0.11 Confirm cloud model and SDK facts.** Read the current model list and the Remote Config model-name page; call `gemini-3.5-flash-lite` once with `ONLY_IN_CLOUD`; confirm free-tier availability (TV-6). *Est 1. AC:* noted in doc 08; model set explicitly.
- [ ] **T-0.12 Decide go/no-go** on the side-panel engine using the gate table in doc 14. *Est 0.5. AC:* ADR-005 updated; plan adjusted.
- [ ] **T-0.13 Ask the organizers (Devpost discussion / Discord).** Questions: (a) is a privately delivered pre-registered debug token acceptable for judge testing (TV-18)? (b) are third-party site UIs in the demo video a logo/trademark problem (TV-20)? (c) free-tier terms vs judges in EEA/UK/CH (TV-19; thread 45919 exists). *Est 0.5. AC:* questions posted; answers recorded in doc 08.
- [ ] **T-0.14 [U] Team split and Representative** (Q-2, Q-9). *Est 0.25. AC:* written in this file.
- [ ] **T-0.15 Spike S-8: Playwright with the extension** (TV-12). *Est 1. AC:* what works recorded; e2e approach chosen.
- [ ] **T-0.16 Set up CI** (GitHub Actions): install, typecheck, lint, unit tests, secret scan. *Est 1. Dep T-0.2. AC:* green on main.

## Phase 1 — Core engine (`src/core`, Nov 20–22)

- [x] **T-1.1 Types and message schemas** (`Span`, `MaskResult`, `GateResult`, `LedgerEntry`, branded `RawText`/`SanitizedText`, `ConsentState`, `AvailabilityState`) per doc 02 §3, doc 12 §4. *Est 2. AC:* typecheck; compile-fail test that `answer('plain string')` does not typecheck.
- [x] **T-1.2 Normalization with offset map** (NFKC, digit folding, zero-width removal; doc 09 §3). *Est 2. AC:* round-trip property tests.
- [x] **T-1.3 Deterministic detectors, GLOBAL pack:** email, phone (E.164), card (Luhn), IBAN (mod-97), account-context, DOB-context, credentials, API-key shapes, custom terms (doc 09 §6.1). *Est 5. AC:* all vectors in doc 09 §12 pass; invalid checksums rejected.
- [x] **T-1.4 Locale packs US and IN** (SSN, ABA; PAN, Aadhaar+Verhoeff, IFSC, UPI, IN phone). Country of residence is India (Q-3). *Est 4. AC:* tests per pack from doc 09 §12.
- [x] **T-1.5 Chunker** with overlap and offset mapping. *Est 3. AC:* round-trip; spans correct across chunk joins.
- [x] **T-1.6 Span merge and overlap resolution** (doc 09 §8). *Est 3. AC:* property-style tests (longest wins, high beats low, rules never removed, exclusions rules).
- [x] **T-1.7 Masker + vault** with canonical values, stable placeholders, collision avoidance for pre-existing placeholder-like text (T-11, doc 09 §9). *Est 3. AC:* tests.
- [x] **T-1.8 Safety gate** (doc 09 §9.3): rule re-scan, vault-value scan, chunk-boundary windows. *Est 3. AC:* adversarial tests (split values, unicode digits, spaced digits, zero-width characters).
- [x] **T-1.9 Restorer** exact + tolerant (doc 09 §10). *Est 3. AC:* tests with mangled variants; unknown tokens flagged; literals untouched.
- [x] **T-1.10 Policy module** (routing from inputs incl. consent, kill switch, offline; doc 10 §9) with Remote Config-shaped config and defaults. *Est 3. AC:* table-driven tests; I-6 test (no cloud route without consent).
- [ ] **T-1.11 Synthetic personal-finance corpus** with ground truth (doc 06 §4). *Est 5. AC:* ≥ 60 samples (target 100), seeded generator script, all fake, dev/held-out split.
- [ ] **T-1.12 Eval harness (rules layer)** reporting recall/precision per type. *Est 3. AC:* report runs in CI.
- [ ] **T-1.13 Performance and adversarial tests** for detectors (doc 09 §11). *Est 1. AC:* 1 MB adversarial string within budget.
- [ ] **T-1.14 Persistence adapters** for vault/conversation/ledger behind interfaces (memory + `storage.session`), settings/consent in `storage.local` (doc 12 §5). *Est 2. AC:* fake storage tests; L-5.

## Phase 2 — Side-panel product (Nov 23–25)

- [ ] **T-2.1 AI wrapper (`src/ai`):** three model instances (doc 10 §1), `redactOnDevice` with schema validation and substring-to-offset mapping, `answer` (sanitized only), availability state machine, timeouts, `inferenceSource` capture and the redactor assertion (I-5). *Est 8. AC:* unit tests with a fake AI port; lint rule restricting `getGenerativeModel` to `src/ai/`.
- [ ] **T-2.2 Model availability + download UX** (doc 11 §4.1, §4.9; doc 10 §2). *Est 3. AC:* manual test with model absent, downloading and present.
- [ ] **T-2.3 Pipeline orchestrator** (chunk, detect, merge, mask, gate) with cancellation and progress events. *Est 4. AC:* integration test with fake AI; rules-only path; degraded-chunk path.
- [ ] **T-2.4 Chat UI:** composer, message list, restored answers, route badges, streaming if supported **[TV-9]**. *Est 5. AC:* usable end to end with a fake cloud.
- [ ] **T-2.5 Review sheet** (doc 11 §4.4): highlights by type, un-mask, add mask by selection, reduced-confidence banner, "show what the AI will see", send gated by the gate result. *Est 6. AC:* keyboard accessible; e2e test.
- [ ] **T-2.6 Ledger drawer** (doc 11 §4.5) with `ON-DEVICE` / `CLOUD` / `RULES` badges, counts, "View sanitized". *Est 3. AC:* matches actual calls in the leak test.
- [ ] **T-2.7 Routing integration:** hybrid answer path, manual override, offline handling, on-device-only mode (F-17). *Est 3. AC:* airplane mode changes the route visibly.
- [ ] **T-2.8 Remote Config + App Check + anonymous Auth wiring** with offline defaults (doc 12 §6). *Est 4. AC:* extension fully works with Remote Config unreachable.
- [ ] **T-2.9 Options page:** entity types, packs, custom terms, strict mode, privacy explainer, consent status, **tester config** (F-18, doc 12 §7). *Est 5. AC:* persisted settings survive restart; tester path works with another Firebase project.
- [ ] **T-2.10 Onboarding flow** (3 steps) and sample finance text button (doc 11 §4.6). *Est 3. AC:* clean profile reaches a first masked chat in under 2 minutes.
- [ ] **T-2.11 Error and empty states** for every item in doc 11 §7. *Est 3. AC:* each has a designed message.
- [ ] **T-2.12 Visual design pass** (tokens, type scale, spacing, dark mode, doc 11 §2). *Est 4. AC:* screenshot review.
- [ ] **T-2.13 Cloud consent gate** (ADR-013, doc 11 §4.7): dialog, versioned storage, enforcement in policy. *Est 3. AC:* I-6 test: no cloud request without consent; revocation works.
- [ ] **T-2.14 Leak and mode tests wired** (L-1, L-2, L-3, L-4, L-6) running in CI against the fake AI. *Est 3. AC:* green in CI.

## Phase 3 — Guard (Nov 26–27)

- [ ] **T-3.1 Guard framework** (doc 12 §8): adapter interface, message bridge to the engine host, `OPEN_PANEL` flow, overlay UI, re-scan on TOCTOU change. *Est 5. AC:* works on a local test page; spike S-2b result applied.
- [ ] **T-3.2 chatgpt.com adapter** (spike S-7; selectors **[TV-11]**). *Est 3. AC:* masked text replaces prompt text and submit proceeds only after confirm.
- [ ] **T-3.3 claude.ai adapter.** Same AC. *Est 3.*
- [ ] **T-3.4 gemini.google.com adapter.** Same AC. *Est 3.*
- [ ] **T-3.5 Failure behavior:** "guard inactive on this page" / "open Privacy Router" states, never silent. *Est 1. AC:* manual test.
- [ ] **T-3.6 Permissions audit:** manifest reviewed; only `sidePanel` and `storage` plus the three content-script matches (doc 12 §2). *Est 0.5. AC:* each permission justified in doc 12.
- [ ] **T-3.7 (stretch) Response restore** on third-party sites. *AC:* only if everything else is done.
- [ ] **T-3.8 Local mock prompt page** for the demo video (ADR-021). *Est 1. AC:* looks neutral (no third-party branding); behaves like a prompt page for the guard.

## Phase 4 — Hardening (Nov 28; feature freeze in the evening)

- [ ] **T-4.1 Leak test L-1** with a network spy across the corpus. *AC:* 0 leaks; in CI.
- [ ] **T-4.2 Full eval run** (rules, Nano, combined) on the held-out split; fill the results table in doc 06 §6. *AC:* numbers recorded; known misses listed honestly.
- [ ] **T-4.3 Placeholder survival rate** on on-device and cloud answers; adjust format/restore if poor. *AC:* documented.
- [ ] **T-4.4 Fresh-profile install test** following README and the tester guide. *AC:* a clean Chrome profile works.
- [ ] **T-4.5 Accessibility pass** (doc 11 §6). *AC:* checklist ticked.
- [ ] **T-4.6 Performance pass** (latency numbers for video claims). *AC:* measured.
- [ ] **T-4.7 Dependency, license and secret scan**, including **git history**, the built bundle (no tokens), and the Devpost form/testing text (V-11). *AC:* no secrets, no debug tokens; dependency licenses listed.
- [ ] **T-4.8 Docs reconciliation:** update docs 02, 08, 09, 10, 12 to match what was built; fill README screenshots. *AC:* no doc contradicts the code.

## Phase 5 — Submission (Nov 29)

- [ ] **T-5.1 README final:** pitch, screenshots, install, setup (Firebase config, flags, App Check debug), architecture diagram, **privacy statement including the free-tier note**, limitations, license, dependency licenses, AI-tool disclosure if desired. *AC:* someone else can run it.
- [ ] **T-5.2 Project description** (Devpost text) from `16-DEVPOST-DRAFT.md` with measured numbers. *AC:* reviewed against doc 07 §3.
- [ ] **T-5.3 Demo video** (≤ 3:00, English, Chrome, no third-party logos) per doc 07 §4. *AC:* script followed; captions added.
- [ ] **T-5.10 Upload video to YouTube early (by Nov 29 morning)**, public, checked logged out (V-9). *AC:* link works logged out.
- [ ] **T-5.4 Testable build:** zip of `dist/` in GitHub Releases + short test guide (no secrets). *AC:* a stranger can load it.
- [ ] **T-5.5 [U] Repo final:** public, license visible in About, tag `submission-v1`. *AC:* verified logged out.
- [ ] **T-5.8 Thumbnail and gallery images** (doc 16 §2.6). *AC:* 3:2 thumbnail, synthetic content only.
- [ ] **T-5.11 [U] Each member ticks their own attestations** on the Additional info step. *AC:* boxes checked by each member.
- [ ] **T-5.12 Re-read Official Rules and the Updates tab** for changes since Nov 18. *AC:* no conflicts.
- [ ] **T-5.6 [U] Devpost submission** with platform = Web/Chrome; Representative presses Submit by end of Nov 29. *AC:* confirmation received.
- [ ] **T-5.7 Buffer day** Nov 30: re-check everything; edits allowed until 2:00 PM PT; **stop pushing** after the final check.
- [ ] **T-5.9 Keep the project accessible until Dec 16** (Firebase project, quota, repo) (V-10); be reachable for winner verification around Dec 21 (V-15).

## Phase 6 — After the extension (not before)
- [ ] **T-6.1** Decide the companion app platform: Android needs a supported physical device (TV-16); iOS needs Apple Intelligence hardware which the owner's iPhone lacks. Start in a **new repo** after the submission tag (ADR-011), reuse `src/core`.

## Daily plan (suggested)
| Day | Focus | Notes |
|---|---|---|
| Nov 18 (today) | docs, T-0.1, T-0.4, T-0.4b, T-0.13, T-0.14 | needs owner actions |
| Nov 19 | T-0.2, T-0.5 to T-0.12, T-0.15, T-0.16 | go/no-go in the evening |
| Nov 20 | T-1.1 to T-1.5 | |
| Nov 21 | T-1.6 to T-1.10 | |
| Nov 22 | T-1.11 to T-1.14, T-2.1 start | |
| Nov 23 | T-2.1 to T-2.4 | |
| Nov 24 | T-2.5 to T-2.9 | |
| Nov 25 | T-2.10 to T-2.14 | |
| Nov 26 | T-3.1, T-3.2, T-3.5, T-3.8 | |
| Nov 27 | T-3.3, T-3.4, T-3.6 | cut sites if behind |
| Nov 28 | Phase 4 | freeze evening |
| Nov 29 | Phase 5 | submit |
| Nov 30 | buffer | stop pushing |
