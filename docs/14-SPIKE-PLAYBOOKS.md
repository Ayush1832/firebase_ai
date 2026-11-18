# 14 — Spike Playbooks (Phase 0)

A spike is a small, throwaway experiment that retires one risk. Each has a time box, steps, what to record, and a pass/fail rule with a fallback. Results go into `08-VERIFY-LIST.md` (promote to [V] only with an observed result) and the decision into `04-DECISIONS.md`.

Rules for all spikes: synthetic text only; no tokens or keys saved to files; keep the throwaway code under `spikes/` (git-ignored or deleted before submission); record exact error messages, Chrome version and date.

Order matters: S-0 first, because every other spike depends on it.

## S-0 — Baseline: Firebase hybrid on a plain localhost page (time box 45 min)
**Goal:** prove the toolchain works on this machine before adding extension complexity.
**Needs:** T-0.1 (Firebase config), T-0.4 (Chrome flags and model), debug token registered.
**Steps**
1. Tiny Vite or static page importing `firebase` (`initializeApp`, `initializeAppCheck` with the debug provider, `getAI`, `getGenerativeModel`) following the Firebase get-started steps [V-20..V-29].
2. One button "Run": call `initializeDeviceModel(cb)` from the click, then `generateContent("Say hello in five words")` with `PREFER_ON_DEVICE`; print `inferenceSource`, latency, text.
3. Repeat with `ONLY_ON_DEVICE` and with `ONLY_IN_CLOUD`.
**Record:** SDK version installed, flag names that were needed (TV-7), `chrome://on-device-internals` model name/version, availability states seen, latency numbers, App Check token behavior.
**Pass:** all three modes return text; `inferenceSource` is `ON_DEVICE` for the first two and `IN_CLOUD` for the third.
**Fail →** check `docs/13` troubleshooting; if the on-device model cannot run on this machine, the project continues in rules-only mode but the demo needs another machine (Q-10) — escalate immediately.

## S-1 — Same code inside the extension side panel (time box 90 min)  [TV-1, TV-24, TV-21]
**Goal:** confirm the Firebase hybrid SDK and the Prompt API work in a side panel page, including user activation and CORS.
**Steps**
1. Minimal MV3 extension per doc 12 §2 with `sidepanel.html` containing the S-0 page code.
2. Load unpacked; open the panel by clicking the action icon; press the button.
3. Watch DevTools (inspect the panel): console, Network (calls to Firebase endpoints, CORS errors), Application.
4. Test `initializeDeviceModel` when called from a click inside the panel.
5. Test with the panel opened by `openPanelOnActionClick` and by keyboard shortcut.
**Record:** works or not; exact errors; whether `host_permissions` are needed [TV]; whether the debug token flow worked (feeds S-3).
**Pass:** `inferenceSource` correct in all three modes inside the panel.
**Fail →** Plan B (in order): (1) open the same page as a full **extension tab** (`chrome-extension://<id>/engine.html`), which is a top-level window [V-41]; (2) offscreen document (S-2); (3) host the engine as a hosted web app and keep the extension as UI + guard (the hackathon accepts Web apps [V-4]) — a major scope decision, record an ADR.

## S-2 — Engine host for the guard (time box 90 min)  [TV-2, TV-23]
**Goal:** decide how the guard reaches the engine.
**Steps**
1. From a content script on a test page (local file served over http://localhost), send a message to the background and on to the open side panel; return a dummy result.
2. Verify `sidePanel.open({ tabId })` can be called inside the handler of a click from the content script [V-44 says a content-script gesture counts; TV-23].
3. Try creating an **offscreen document** (reason e.g. `WORKERS` or `DOM_PARSER` with an honest justification) and calling the Firebase hybrid code there; record whether `initializeDeviceModel` needs activation it cannot get (offscreen documents cannot be focused [V-45]).
4. Check that the service worker truly lacks `LanguageModel` (expected from V-41).
**Decision rule:** if the panel-as-engine path works and `OPEN_PANEL` from the guard works → keep ADR-005 as is. If the offscreen path works without activation problems → consider it only if it saves a documented user pain. Record in ADR-005.

## S-3 — App Check in an extension (time box 2 hours)  [TV-3, TV-18]
**Goal:** a real AI call succeeds with enforcement on, and find a way for testers.
**Steps**
1. Use the debug flow from doc 13 §2.1 inside the panel. Register the token. Confirm a cloud call succeeds (`ONLY_IN_CLOUD`) and fails after removing the token (negative test).
2. Check whether the debug token persists across extension reloads (where Firebase stores it) and whether `self.FIREBASE_APPCHECK_DEBUG_TOKEN = '<string>'` from an options-page value works.
3. Research providers: which App Check providers work in a `chrome-extension://` origin without remote scripts (the CSP blocks them [K]); try a custom provider only if time allows.
4. Draft the tester path (doc 12 §7) and the question to the organizers (TV-18 option b).
**Pass:** documented working procedure; no token in git.
**Fail →** tester-bring-your-own-project path remains the plan; mention clearly in the description.

## S-4 — `ONLY_ON_DEVICE` when the model is unavailable (time box 45 min)  [Task T-0.8]
**Goal:** prove no network request happens when on-device is not available (privacy invariant I-2).
**Steps**
1. Disable the Chrome flag (or use a profile without the model) so availability is `unavailable`.
2. Run the S-1 page with `ONLY_ON_DEVICE`; observe the exception **and** the Network tab: no request to any AI endpoint.
3. Repeat while the model is `downloading` to confirm the request waits (V-22) and no cloud request is made.
**Record:** error type/message; network log screenshot description.
**Pass:** exception, zero network requests to AI endpoints; waiting behavior while downloading.
**Fail →** the `ONLY_ON_DEVICE` guarantee is not enough by itself; add a pre-check `availability()` gate and block at our layer too (already planned in doc 10 §2).

## S-5 — Structured entity extraction quality and latency (time box 3 hours)  [TV-4, TV-22]
**Goal:** choose chunk size, measure latency, check JSON validity and token cost of the constraint.
**Steps**
1. Use the redactor skeleton and prompt from doc 10 §1 and §4 with the response schema.
2. Run on 10 synthetic samples of 300, 800, 1,500, 3,000 characters (hand-labeled names/addresses; use the first slice of the corpus when T-1.11 exists).
3. Log per run: latency, JSON valid?, entities found vs expected, `session.contextUsage/contextWindow` if reachable, whether `omitResponseConstraintInput` helps [V-43].
4. Run the three injection cases (doc 10 §4.2).
5. Compare session-per-request against `clone()`.
**Record:** table of latency by size; recall/precision on the hand labels; the chosen `chunk_chars`; prompt v1 vs v2.
**Pass/Decision:** JSON valid ≥ 95% (or invalid → treated as degraded and still safe); latency acceptable for the demo; chunk size fixed. If latency is too high, shrink chunks or cap Nano chunks and rely on rules plus review (document honestly).

## S-6 — Remote Config from an extension (time box 60 min)  [TV-5]
**Steps:** fetch with `fetchAndActivate` in the panel; set `minimumFetchIntervalMillis` low in dev; test offline defaults (airplane mode); verify caching in `rcCache`.
**Pass:** defaults apply offline; fetched values override online.
**Fail →** drop Remote Config to "static defaults + options page" and say so (cut order step 2 does not apply; adjust the judging evidence).

## S-7 — Guard editors on the three sites (time box 3 hours total, Phase 3)  [TV-11]
For each site: find the prompt box and send button; read text; write text so the site's editor accepts it (try input events, `execCommand('insertText')`, simulated paste); intercept Enter and click in the capture phase; confirm the site submits **masked** text after confirm. Record selectors with the date.
**Fail for a site →** cut that site (cut order step 4); never ship a guard that silently fails (T-3.5).

## S-8 — Playwright with the extension (time box 60 min)  [TV-12]
Try `launchPersistentContext` with `--disable-extensions-except` / `--load-extension` on Playwright's Chromium; then on branded Chrome (may be ignored in Chrome 137+ [K]). Record what works. Plan: e2e with a fake AI on Chromium; manual Nano checks.

## S-9 — Demo-environment rehearsal (time box 60 min, Phase 4/5)
Record a 60-second trial with the video tool; confirm legibility at 1080p, audio, airplane-mode toggle, and that no third-party logos appear (TV-20).

## Result log template (copy into `08-VERIFY-LIST.md` or an ADR)
```
Spike: S-?   Date:   Chrome:   SDK version:   Machine:
Result: PASS | PARTIAL | FAIL
Observed: ...
Exact errors: ...
Decision / ADR updated: ...
VERIFY-LIST items promoted: TV-? -> V-?
```

## Decision gate at the end of Phase 0 (T-0.12)
By end of Nov 19 the following must be true or the plan changes:
| Question | Needed answer | If not |
|---|---|---|
| S-0 passes on this machine | yes | escalate; consider another test machine |
| S-1 passes in the side panel (or Plan B-1) | yes | Plan B in order |
| App Check works in dev (S-3) | yes | no AI calls possible → blocker; ask organizers/Discord |
| Nano JSON entity extraction usable (S-5) | usable or degrade gracefully | rules-first product, Nano as bonus |
| ONLY_ON_DEVICE behavior verified (S-4) | yes | add our own availability gate |
