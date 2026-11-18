# 04 — Architecture Decision Records

Format: Context, Decision, Alternatives, Consequences. Status: Accepted unless noted. Items marked *user-decided* came from the product discussion.

## ADR-001 — Product shape: side panel first, guard second *(user-decided)*
- Context: the idea is "a trust layer in front of AI". The side panel is where the Firebase hybrid pipeline (on-device redaction plus cloud answer) is fully visible; the guard is the "works in front of any AI you already use" hook.
- Decision: Phase 1 side-panel private chat, Phase 2 guard on chatgpt.com, claude.ai, gemini.google.com.
- Alternatives: guard only (weak Firebase cloud usage), side panel only (loses the distinctive angle).
- Consequences: guard work is cut first if time runs out; Phase 1 must be demo-complete on its own.

## ADR-002 — No-model fallback: rules-only, never raw to cloud *(user-decided)*
- Decision: when Gemini Nano is unavailable, use the deterministic detector only, label "reduced confidence", require review.
- Alternatives: block entirely (judges on other machines see nothing), allow cloud with warning (breaks the promise).
- Consequences: the extension is demonstrable on any machine; privacy claim stays intact; detection quality is lower in this mode and the UI says so.

## ADR-003 — Redaction uses `ONLY_ON_DEVICE`
- Decision: all calls that see raw text use `InferenceMode.ONLY_ON_DEVICE`, which throws if the model is unavailable instead of falling back [V-21]. The Firebase hackathon FAQ endorses this pattern ("keep sensitive data on-device only", [V-13]).
- Consequences: privacy is enforced by the SDK mode, not by our own if-statements; plus the type-level guard in the design doc.
- Caveat found Nov 18: with `ONLY_ON_DEVICE`, a request made while the model is still downloading **waits** for the download (minutes) [V-22]. See ADR-015.

## ADR-004 — Two-layer detection (rules + Nano)
- Context: small on-device models miss things and can be manipulated; regex cannot find names.
- Decision: rules always run and cannot be overridden by the model; the model only adds spans.
- Consequences: more code, but robust against model failure and injection.

## ADR-005 — Engine hosted in the side panel (offscreen document as fallback)
- Context: `initializeDeviceModel` needs a user interaction [V-22]. The Prompt API is documented as available to top-level windows and same-origin iframes and **not available in Web Workers** [V-41], so the service worker cannot host the model. Chrome documents the Prompt API for extensions [V-40]. Offscreen documents cannot be focused and have no AI reason code [V-45], so user activation there is doubtful **[TV-2]**.
- Decision: host the AI engine in the side panel page. The guard reaches it through the background worker; if the panel is closed the guard shows "Open Privacy Router to scan this prompt" and calls `sidePanel.open()` from the user's click (a content-script gesture counts, [V-44], **[TV-23]**). An offscreen document is considered only if spike S-2 shows a clear benefit.
- Plan B if S-1 fails: engine in an extension **tab** page (a top-level window), then offscreen, then a hosted web app (doc 14).
- Consequences: the guard needs the panel open (one click). Documented limitation, never a silent failure.

## ADR-006 — Placeholder format `[TYPE_n]`
- Decision: bracketed typed tokens, stable per value within a conversation.
- Alternatives: opaque UUIDs (models may mangle), unicode brackets (tokenization risk).
- Consequences: need to measure placeholder survival rate and tolerant restore **[TV]**; may change format if survival is poor.

## ADR-007 — Amounts are not masked by default
- Context: finance questions need numbers ("can I afford this loan?"). Masking amounts destroys utility.
- Decision: `AMOUNT` is off by default; "strict mode" turns it on; the UI explains the trade-off.

## ADR-008 — Stack: TypeScript, Vite (no extension plugin), React, Vitest, Playwright
- Context: 12 days, need speed and low tooling risk.
- Decision: Vite multi-entry build with a hand-written `manifest.json` (no CRXJS or similar plugin to avoid maintenance/compat risk), React 18 for side panel/options, plain CSS, Vitest for logic, Playwright for e2e.
- Alternatives: plugin-based Vite extension frameworks (faster HMR but a dependency risk), vanilla JS (slower UI work).
- Status: revisit at scaffolding if the build gets painful.

## ADR-009 — Auth: anonymous by default
- Decision: anonymous Firebase Auth to satisfy AI Logic/App Check needs with zero friction; Google sign-in only if it works easily in MV3 **[TV]**.

## ADR-010 — Firestore optional, never user data
- Decision: if used at all, only for public detector packs. User text, vault, ledger and custom terms never leave the device except sanitized prompts to the model.

## ADR-011 — Companion app deferred
- Decision: no Android/iOS work until Phases 1 and 2 plus submission materials are done. Shared pure logic in `src/core/` keeps a later port possible.
- Repo rule: commits after the deadline are not evaluated and the FAQ advises cloning into a **new repo** to keep building [V-2]. Companion-app work therefore starts in a **separate repo** after the submission tag `submission-v1`; it must not be pushed to this repo before the deadline.
- Note: the development iPhone does not support Apple Intelligence, so iOS on-device testing is not available on it; Android on-device needs a supported physical device **[TV: which devices]**.

## ADR-012 — License: Apache-2.0
- Decision: Apache-2.0 (the hackathon prefers Apache; any open-source license is accepted [V-8]). LICENSE must be detectable in the repo's About section.
- Status: `LICENSE` committed (`e4f4505`, standard text, unmodified). GitHub detection in About is **not yet confirmed** (V-53); check after the next successful API call.

## ADR-013 — Cloud consent gate, 18+/region acknowledgment, on-device-only mode
- Context: on the free Gemini API tier ("Unpaid Services") Google may use submitted content to improve products and human reviewers may read it, and the terms say not to submit sensitive, confidential or personal information [V-35]. The terms also require users to be 18+, forbid use in apps likely accessed by minors [V-37], and allow only Paid Services for users in the EEA, Switzerland and the UK [V-38]. Another entrant asked the organizers how this fits "free judge access" and had no answer yet (TV-19).
- Decision: the cloud route is **off until the user gives consent** in a dialog that states the free-tier data use in plain words and collects three acknowledgments (18+, not in EEA/CH/UK, understands the note). An **on-device-only mode** is always available and is the default route when consent is absent. Consent is versioned and stored locally. A Remote Config kill switch can force on-device-only.
- Alternatives: no cloud at all (loses the hybrid story the judges score, V-6); cloud on by default (breaks the honest-privacy promise); link billing (Q-8) to get Paid Services terms (user's cost decision; the consent gate remains regardless).
- Consequences: one more dialog and settings entry; the demo must show consent being granted once; the README and description state the free-tier note (honesty is part of Potential Impact/Idea). Judges in the EEA/UK/CH can still evaluate on-device mode.

## ADR-014 — Three model instances, explicit routing
- Context: each `GenerativeModel` has one mode and one config; different features may use different modes [V-13, V-25].
- Decision: `redactor` (`ONLY_ON_DEVICE`, structured output), `responderHybrid` (`PREFER_ON_DEVICE`), `responderCloud` (`ONLY_IN_CLOUD`), all created in `src/ai/`. Our `policy` module chooses between the two responders and records `{ route, reason }` in the ledger. We do not rely on `PREFER_IN_CLOUD`.
- Consequences: the ledger can explain every routing decision; unit-testable policy; slightly more instances.

## ADR-015 — Explicit on-device state machine; never call the redactor unless `ready`
- Context: `ONLY_ON_DEVICE` waits for an in-progress download and can take minutes [V-22]; `initializeDeviceModel` needs a click [V-22]; the model is removed if disk space drops under 10 GB [V-42].
- Decision: track `unknown | unavailable | downloadable | downloading | ready | degraded` using `LanguageModel.availability()` (the single permitted direct Chrome AI call, a status check) and `initializeDeviceModel` progress; call the redactor only in `ready`; otherwise run rules-only and say so. Per-chunk timeouts and aborts protect against hangs.
- Consequences: no mysterious hangs; clear UX; slightly more state code.

## ADR-016 — Testers bring their own Firebase project (no secrets in the submission)
- Context: App Check is enforced [V-29]; the rules forbid live secrets in the repo, form or testing instructions [V-11]; debug tokens are accepted [V-12]; judges may skip testing [V-10].
- Decision: the options page accepts a tester's Firebase web config and App Check debug token (stored in `storage.local`, clearable); `docs/13-SETUP-GUIDE.md` explains the ten-minute setup. The video and text must be sufficient on their own. Separately ask organizers about a private token path (TV-18).
- Alternatives: ship our token in the build (violates V-11); hosted web app that proxies (changes the product; not a Chrome-extension test).
- Consequences: extra settings UI (T-2.9); a documented, honest testing story.

## ADR-017 — One flattened single-turn prompt for both answer routes
- Context: on-device inference is single-turn and multi-turn chat is unsupported there [V-27]; token counting is unreliable in hybrid mode [V-27].
- Decision: build one prompt from the sanitized history for either route; budget by `chars / 4`; store only the placeholder versions of assistant turns.
- Consequences: identical behavior across routes, simpler tests; cloud multi-turn is an optional later optimization.

## ADR-018 — Vault and conversation in `chrome.storage.session`; never synced
- Context: session storage is in memory, cleared on disable/reload/update/restart, and hidden from content scripts by default [V-46]; hard rule 5 forbids persisting the vault.
- Decision: vault, sanitized conversation and ledger live in `storage.session`; settings and custom terms in `storage.local`; `storage.sync` is never used; we do not change the session access level.
- Consequences: panel reopen restores the chat during a browser session; restart wipes it by design (invariant I-4).

## ADR-019 — Cloud model chosen explicitly via Remote Config with an in-code default
- Context: the SDK default model changed to `gemini-3.5-flash-lite` from v13.0.0 and Gemini 2.5 models are being retired [V-24].
- Decision: pass `inCloudParams.model` explicitly from `cloud_model` (Remote Config), default `gemini-3.5-flash-lite` [V-24], verified live at T-0.11 (TV-6).
- Consequences: model changes need no extension update; SDK upgrades cannot silently change behavior.

## ADR-020 — Guard behavior: never silent, original send is explicit
- Decision: the guard always shows a state (scanning, masked, nothing found, blocked, engine closed, inactive). If the engine is not open it offers "Open Privacy Router" (user gesture). "Send original" exists but needs an explicit second click and is recorded in the local ledger. Esc cancels the send; it never sends.
- Consequences: honest UX on a fragile surface; the guard may be cut per the cut order but never ships silent failures.

## ADR-021 — Demo avoids third-party logos and trademarks
- Context: the FAQ says to avoid third-party logos, trademarks or content we lack rights to; the rules forbid content implying third-party sponsorship [V-9]. The guard targets three third-party sites.
- Decision: record the guard scene on a local mock prompt page or a tight crop with logos hidden/blurred; mention sites by name only in text where needed. If unsure, ask the organizers (TV-20).
- Consequences: slightly less "real-world" footage; avoids a disqualification risk.

## ADR-022 — Submission freeze and tag
- Context: commits after Nov 30, 2:00 PM PT are not evaluated; the submission locks [V-2].
- Decision: feature freeze Nov 28 evening; submit Nov 29; tag `submission-v1` on the final commit; after that only defect fixes before the deadline, then stop. Companion app goes in a new repo (ADR-011).
