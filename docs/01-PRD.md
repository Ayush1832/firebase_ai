# 01 — Product Requirements (PRD)

Evidence labels as in `08-VERIFY-LIST.md`: [V] verified, [TV] to verify, [D] our decision.

## 1. Problem
People paste personal financial details (names, account and card numbers, tax IDs, statements, emails) into cloud AI assistants to get help with budgeting, loan letters, tax questions or dispute emails. Once sent, that data sits on someone else's servers. Existing advice is "just don't paste it", which makes the AI much less useful.

A second, quieter problem: on Google's free Gemini API tier, content sent to the API may be used to improve Google products and read by human reviewers, and the terms say not to submit sensitive or personal information [V-35]. So "send it to a cloud AI, but carefully" needs a technical answer, not just a warning.

## 2. Solution
A Chrome extension that makes cloud AI safe to use with financial text:
- **On-device** detection and masking of sensitive data (Gemini Nano through Firebase AI Logic hybrid inference, plus deterministic rules).
- Only **sanitized** text can reach the cloud model, and only after the user reviews it and has consented to cloud answers.
- Real values are **restored locally** in the answer.
- A **ledger** makes the privacy boundary visible: what stayed, what left, which model (on-device or cloud) handled each step.
This mirrors the Firebase team's own guidance: keep sensitive data on-device only and use hybrid or cloud for the rest [V-13].

## 3. Target users and personas
Demo domain (decided): **personal finance**.

| Persona | Needs | Pain today | How we serve |
|---|---|---|---|
| **Maya, salaried professional (primary)** | Draft a dispute email to her bank; ask whether she can afford a loan | Hesitates to paste card/account numbers into AI, so copy-edits by hand | Paste as is; review the masked version; get a usable answer with her values restored |
| **Arjun, freelancer (secondary)** | Summarize client invoices; draft payment reminders | Invoices contain client names, bank details, tax IDs | Batch-friendly masking, custom terms for client names, ledger as evidence of care |
| **Sam, privacy-conscious user** | Use AI offline or only on-device when possible | Distrusts cloud AI | On-device-only mode, visible routes, no account needed |
| **Judge / evaluator (stakeholder)** | Understand the value and the Firebase usage in minutes | Little time, many entries | Clear video, visible hybrid routing, honest limits, repo with run steps |
Users are adults (the free-tier terms require 18+ [V-37]).

## 4. Scope

### Phase 1 — Side-panel private chat (MVP, must ship)
- Chrome side panel with a chat UI.
- Pipeline: chunk, detect (rules + Gemini Nano), mask, gate, review, send sanitized text, answer, restore.
- Review step: highlighted replacements; un-mask or add items before sending; "show what the AI will see".
- Answer route is hybrid: short or simple tasks on-device when available, otherwise cloud (sanitized only, with consent).
- Cloud consent gate and on-device-only mode.
- Ledger for each message.
- Settings: strict mode (also mask amounts), custom "always mask" terms, locale packs, per-type toggles, route preference, tester Firebase config.
- Graceful states: model not downloaded (download button with progress and disk requirement), unsupported device (rules-only with reduced-confidence banner), offline (on-device only), cloud unavailable, gate blocked.

### Phase 2 — Guard on third-party AI sites (should ship)
- Supported sites (decided): **chatgpt.com, claude.ai, gemini.google.com**.
- Before the user submits a prompt, intercept, run the same on-device pipeline, show a small preview ("5 items masked"), replace the text in the box on confirm.
- Uses on-device detection only; the third-party site is the "cloud" in this flow.
- Never fails silently; shows "inactive" or "open Privacy Router" states.
- Stretch: restore placeholders in the site's response.

### Phase 3 — Companion app (only after the extension and submission are complete)
Android and/or iOS companion for multi-platform consideration (multi-platform is preferred but not required [V-4]). Out of scope until Phases 1, 2 and the submission materials are done; starts in a new repo after the submission tag (ADR-011, ADR-022).

### Non-goals
- No accounts or cloud storage of user content. No sync of user data.
- No image, PDF or audio input in v1.
- No guarantee of detecting every sensitive item; stated honestly in the UI.
- No browsers other than Chrome desktop; no incognito support in v1.
- No telemetry or analytics.
- No selling or advice features: the tool is not a financial adviser.

## 5. Functional requirements

| ID | Requirement | Phase | Acceptance sketch |
|---|---|---|---|
| F-1 | Detect and mask entity types in doc 09 §2 | 1 | corpus recall reported per type |
| F-2 | Deterministic detectors with validators (Luhn, mod-97, Verhoeff, ABA) run before and independently of the model | 1 | vectors in doc 09 §12 pass |
| F-3 | Gemini Nano detection via Firebase AI Logic with structured JSON output, `ONLY_ON_DEVICE` | 1 | `inferenceSource` always `ON_DEVICE` |
| F-4 | Consistent placeholders within a conversation | 1 | same value → same placeholder |
| F-5 | Local vault, memory/session only | 1 | L-5 storage audit |
| F-6 | Answer step receives only sanitized text; each call records `inferenceSource` | 1 | L-1 leak test, ledger |
| F-7 | Restore placeholders locally; handle missing or altered placeholders gracefully | 1 | restore tests, survival metric |
| F-8 | User review before any cloud call, with undo and "mask this too" | 1 | e2e review test |
| F-9 | Ledger per message: counts, route per step, `ON_DEVICE`/`IN_CLOUD`, "raw text left device" result | 1 | matches actual calls |
| F-10 | Safety gate: re-scan; block on remaining high-confidence item | 1 | adversarial tests |
| F-11 | Remote Config policy with safe in-code defaults offline | 1 | works with RC unreachable |
| F-12 | Model availability and download UX including disk requirement | 1 | manual test absent/present |
| F-13 | Long input handling: chunk; cap; rules-only remainder with a warning | 1 | oversized-input test |
| F-14 | Guard adapters for 3 sites with preview and confirm | 2 | per-site manual test |
| F-15 | Response restore on third-party sites | 2 stretch | only if time |
| F-16 | **Cloud consent gate**: cloud answers disabled until the user acknowledges 18+, not in EEA/CH/UK, and the free-tier data note (ADR-013) | 1 | I-6 test: no cloud request without consent |
| F-17 | **On-device-only mode** always available; default route when consent absent | 1 | works offline |
| F-18 | **Tester configuration**: options fields for Firebase config and App Check debug token (ADR-016) | 1 | works on a fresh profile with own project |
| F-19 | Onboarding in 3 steps; first masked chat under 2 minutes | 1 | stopwatch on a clean profile |
| F-20 | Export ledger as counts-only JSON (optional) | 1 stretch | no values in export |

## 6. Non-functional requirements
- **Privacy:** `03-PRIVACY-THREAT-MODEL.md`. Zero leaks of seeded values in the corpus (L-1).
- **Latency:** rules-only under 100 ms for typical input; Nano per chunk and end to end measured and reported, not promised (target to set after spike S-5).
- **Reliability:** every failure mode ends in a safe state (nothing sent) with a clear message.
- **Design:** a complete product feel (judging criterion, V-7). All states designed (doc 11).
- **Accessibility:** keyboard navigable, AA contrast target, labeled controls, reduced-motion respected.
- **Compatibility:** Chrome desktop 139+ [V-20]; on-device needs macOS 13+/Windows 10-11/Linux, about 22 GB free disk and a capable GPU or CPU [V-42]; works rules-only elsewhere.
- **Free to use:** required by the rules [V-10].
- **Security:** minimal permissions, strict CSP, no remote code (doc 12).
- **Maintainability:** `src/core` has no browser or Firebase imports; adapters isolated per site.
- **Legal/ethical:** open-source license; honest claims; follows the Gemini API terms for the free tier (adults only, regional limits) [V-37, V-38].

## 7. Success criteria
1. Meets every hackathon submission requirement and passes Stage One (doc 07 §3, V-6).
2. The 3-minute video shows, early: the problem, the masked text, the ledger with on-device/cloud labels, restored answer, and offline behavior.
3. Corpus recall for structured identifiers at or near 100% with the remainder caught by review; free-text recall reported honestly.
4. Works on a clean Chrome profile by following the README (and the tester guide).
5. Leak test and mode tests pass in CI.
6. Design: no placeholder text, every state handled, accessibility checklist done.

## 8. User stories (with acceptance)
| ID | Story | Acceptance |
|---|---|---|
| US-1 | As Maya, I paste a dispute email and see which parts will be masked before anything is sent | Review sheet highlights name, card, account; Send disabled until gate passes |
| US-2 | As Maya, I can un-mask something harmless and mask something missed | Both actions work and persist for the conversation; high-confidence un-mask asks to confirm |
| US-3 | As Maya, I get an answer that mentions my real name and not placeholders | Restore replaces tokens; unknown tokens flagged |
| US-4 | As Sam, I can use the tool with no cloud at all | On-device-only mode answers (or says clearly if the model is not ready) |
| US-5 | As Sam, I can see proof of what was sent | Ledger "View sanitized" shows the exact string sent; "Raw text left your device: No" only when true |
| US-6 | As Arjun, I add client names as always-mask terms | Custom terms masked every time, stored locally only |
| US-7 | As any user without Gemini Nano, I still get protection with an honest warning | Rules-only banner; review mandatory |
| US-8 | As any user, I am asked before the cloud is used and told about free-tier data use | Consent dialog; no cloud request before consent |
| US-9 | As a user of an AI site, I see a preview before my prompt is submitted | Guard overlay with counts and confirm |
| US-10 | As a judge, I can understand and try it quickly | Video, README, tester guide |

## 9. User journeys (summary)
1. **First run:** install → onboarding step 1 (what leaves/stays) → step 2 enable on-device AI (progress) or skip → step 3 sample message → first masked chat.
2. **Everyday:** paste → Send → analyzing → review → confirm → answer with route badge → ledger.
3. **Offline:** airplane mode → send → on-device only → answer; cloud shown as unavailable.
4. **No model:** unsupported machine → rules-only banner → mandatory review → on-device answer unavailable → cloud (if consented) or message.
5. **Guard:** type prompt on a supported site → Send → overlay → confirm → site submits masked text.

## 10. Dependencies and assumptions
- Firebase project with AI Logic, App Check, Remote Config, anonymous Auth (T-0.1; owner action).
- Chrome 139+ with the on-device flags and model on the demo machine (T-0.4; TV-7).
- The Gemini cloud model named in Remote Config is available on the free tier [TV-6].
- App Check debug provider works in an extension [TV-3].
- The team of two can split work (Q-9); the deadline is fixed [V-1].

## 11. Out of scope for the hackathon deadline, in the backlog
Response restore on third-party sites (stretch), Firestore detector packs, Google sign-in, more locale packs, export/import of settings, mobile companion, Chrome Web Store release (needs a production App Check path and policy review).

## 12. Judging map
| Criterion (official) | How this project answers it |
|---|---|
| Technological Implementation | Real hybrid use: `ONLY_ON_DEVICE` structured redaction, hybrid routing for answers, `inferenceSource` surfaced, App Check, Remote Config policy, deterministic safety gate, leak test |
| Design | Complete side-panel product with onboarding, review, ledger, settings, consent, every state designed |
| Potential Impact | Specific audience (people using AI with personal finance data), shown end to end, with honest limits and the free-tier data note |
| Quality of the Idea | Trust layer in front of AI; privacy boundary as the feature; applies the Firebase team's own "sensitive data on-device only" guidance literally |

## 13. Glossary
- **On-device model / Gemini Nano:** Chrome's built-in model reached through the Prompt API and, here, through Firebase AI Logic.
- **Hybrid inference:** Firebase AI Logic modes that choose between on-device and cloud models.
- **Placeholder:** typed token like `[CARD_1]` replacing a sensitive value.
- **Vault:** local map from placeholder to real value; never leaves the device.
- **Gate:** deterministic re-scan that decides whether masked text may leave the review stage.
- **Ledger:** per-message record of steps, routes and counts (never values).
- **Guard:** content script that scans prompts on third-party AI sites before submission.
- **Rules-only mode:** detection by patterns and checksums only, used when Nano is unavailable.
- **Consent gate:** one-time dialog required before cloud answers.
