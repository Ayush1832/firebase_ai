# 15 — Risk Register

Likelihood (L) and Impact (I): Low / Medium / High, judged on Nov 18 with the information in `08-VERIFY-LIST.md`. Review at the end of each phase. A risk with a trigger fires its plan B immediately; do not wait.

## 1. Technical risks

| ID | Risk | L | I | Mitigation | Trigger → Plan B |
|---|---|---|---|---|---|
| R-1 | Firebase hybrid SDK or Prompt API misbehaves inside the extension side panel (TV-1, TV-24) | M | H | Spike S-0/S-1 first (Nov 18-19); Chrome documents extension support (V-40) | S-1 fails → extension tab page, then offscreen, then hosted web app (doc 14) |
| R-2 | Gemini Nano is unavailable or too slow on the demo machine (hardware, flags, disk) | M | H | S-0 early; Chrome hardware bar met on paper (V-42, V-50); 22 GB free rule | model won't run → rules-only demo is weaker; get another machine (Q-10) by Nov 20 |
| R-3 | Nano entity extraction has poor recall or invalid JSON (TV-4) | M | M | Rules carry structured identifiers; Nano is additive; review step; honest metrics | S-5 recall low → improve prompt, smaller chunks, few-shot; accept and report honestly |
| R-4 | App Check blocks all AI calls in the extension (TV-3), or no workable provider for testers (TV-18) | M | H | S-3 on Nov 19; debug provider accepted for submissions (V-12); tester bring-your-own-project path (doc 12 §7) | no working path → ask organizers in Discord/Devpost; document limitation |
| R-5 | `ONLY_ON_DEVICE` request waits on a download and appears hung (V-22) | H (if unhandled) | M | explicit availability/download state machine (doc 10 §2) | n/a, designed out |
| R-6 | Placeholders are mangled by the answer model, so restore is poor (TV-15) | M | M | strict system prompt; tolerant restore; measure survival (T-4.3); change format if survival is low | survival < 90% → change placeholder style, add instruction examples |
| R-7 | Guard breaks on a site (DOM changes, rich editors) (TV-11) | H | M | one adapter per site with dated selectors; "inactive" chip; cut order step 4/5 | adapter fails after 3 h → cut the site |
| R-8 | Chrome auto-update changes flags or the Prompt API between now and the deadline | L | M | note Chrome version in every record; avoid updating Chrome during the final week | behavior changes → re-run S-0 |
| R-9 | SDK version differences (v12.5 vs v13) change option names (TV-21) | M | M | pin the version at scaffold; read changelog; wrapper isolates `src/ai/` | build errors → adapt wrapper only |
| R-10 | Cloud model name/quota changes (Gemini 2.5 retirement, new defaults) (V-24) | M | M | set model explicitly via Remote Config with in-code default; verify at T-0.11 | calls 404 → switch to a current model name |
| R-11 | Playwright cannot load the extension in branded Chrome (TV-12, K) | H | L | e2e on Chromium with fake AI; manual real-Nano checklist | n/a |
| R-12 | Regex catastrophic backtracking or slow detectors | L | M | linear-time patterns; adversarial 1 MB test (doc 09 §11) | slow → rewrite pattern |
| R-13 | Streaming splits placeholders (TV-9) | M | L | buffer until closing bracket; restore at end | → non-streaming |

## 2. Privacy and trust risks

| ID | Risk | L | I | Mitigation |
|---|---|---|---|---|
| R-20 | A code path sends raw text to the cloud | L | **Critical** | branded `SanitizedText`, lint rule, `ONLY_ON_DEVICE` for raw-text calls, leak test L-1 in CI, review of every PR touching `src/ai` |
| R-21 | **Free-tier Gemini terms**: sanitized prompts may be used to improve Google products and be read by human reviewers (V-35); undetected items could therefore be seen | H (if on free tier) | H | cloud consent gate with plain wording (ADR-013); on-device-only mode; honest README/description; Q-8 billing option; emphasize masking and review |
| R-22 | Users in EEA/UK/Switzerland or minors use the free-tier cloud route against the terms (V-37, V-38; TV-19) | M | M | consent checkboxes (18+, not in those regions); cloud kill switch; state in the README that the cloud route is for adults outside those regions on the free tier |
| R-23 | Detection misses an item and the user trusts the tool too much | H | H | honest copy; mandatory review in reduced mode; strict mode; published recall numbers; no "100% private" claims |
| R-24 | App Check debug token or config leaks in the repo, form or instructions (V-11) | M | H | `.gitignore`, grep check in CI (T-4.7), tokens only pasted in the options page, scan git history before submission |
| R-25 | A real personal value slips into a fixture, screenshot or video | L | H | synthetic generator only; pre-commit grep for card/IBAN-like strings that are not on the allowlist of test values; video review pass |

## 3. Hackathon-rule and submission risks

| ID | Risk | L | I | Mitigation |
|---|---|---|---|---|
| R-30 | Stage One fails on a missing requirement (V-6) | L | **Critical** | requirements checklist in doc 07 §3, reviewed twice before submit |
| R-31 | Demo video displays third-party logos/trademarks (ChatGPT, Claude, Gemini UI) (V-9, TV-20) | M | M | show the guard on a local mock page or tightly cropped input area; blur logos; ask organizers if unclear |
| R-32 | Judges cannot run the extension under enforced App Check (TV-18) | H | M | video and text carry the story (V-10: judges may skip testing); bring-your-own-project guide; ask organizers about private token delivery |
| R-33 | Repo changes after the deadline are not evaluated; or edits made after submitting break the repo (V-2) | M | M | freeze at end of Nov 29; use a tag `submission-v1`; develop the companion app in a new repo afterwards (FAQ advice) |
| R-34 | YouTube processing delay or wrong visibility (V-9) | M | H | upload by Nov 29 morning, public, check logged out; keep under 3:00 |
| R-35 | Team member not added on Devpost or ineligible (V-3) | L | H | team already added; confirm both members' eligibility and country (India is eligible, V-3) before submit |
| R-36 | Judging-period availability: the project must stay free and accessible until Dec 16 (V-10) | M | M | keep the Firebase project alive and within free quota; do not delete the repo; monitor quota |
| R-37 | Devpost form quirks (video URL validation, tag normalization) (V-52) | M | L | use a real YouTube watch URL; verify the saved form after each edit |
| R-38 | Using a third-party SDK/data without authorization (V-14) | L | M | list dependencies and licenses in README (T-4.7); only permissive-licensed packages |

## 4. Schedule and team risks

| ID | Risk | L | I | Mitigation |
|---|---|---|---|---|
| R-40 | Only 12 days; Phase 0 spikes overrun | M | H | time boxes (doc 14); decision gate T-0.12 on Nov 19; cut order in doc 05 |
| R-41 | Two-person team without a defined split (Q-9) | M | M | decide the split on Nov 18-19; one person owns `src/core`+tests, the other `src/extension`+UI is a suggested default; daily 10-minute sync |
| R-42 | Scope creep (guard, response restore, Firestore) | H | M | strict phase gates; "never cut" list: gate, leak test, review step, demo quality |
| R-43 | Video recording takes longer than planned | M | H | rehearse S-9 on Nov 28; script in doc 07 §4; record on Nov 29 morning with buffer |
| R-44 | Fatigue and late-night errors in the final 48 hours | M | M | complete features by Nov 28 noon; Nov 29 for submission only; Nov 30 buffer |
| R-45 | Machine failure / disk full during the model download | L | H | keep ≥ 50 GB free; commit and push daily; second machine for the video if possible |

## 5. Top five to watch (as of Nov 18)
1. R-1 and R-2: does on-device inference run in the extension, on this machine? (S-0 and S-1, first day)
2. R-4 and R-32: App Check in an extension and judge testability.
3. R-21: the free-tier data terms vs the privacy promise: be upfront.
4. R-31: trademarks in the guard demo.
5. R-40: schedule.

## 6. Review log
| Date | Phase | Changes |
|---|---|---|
| Nov 18 | Planning | initial register |
