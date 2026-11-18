# 01 — Product Requirements (PRD)

## 1. Problem
People paste personal financial details (names, account and card numbers, tax IDs, statements, emails) into cloud AI assistants to get help with budgeting, loan letters, tax questions or dispute emails. Once sent, that data sits on someone else's servers. Existing advice is "just don't paste it", which makes the AI much less useful.

## 2. Solution
A Chrome extension that makes cloud AI safe to use with financial text:
- **On-device** detection and masking of sensitive data (Gemini Nano via Firebase AI Logic hybrid inference, plus deterministic rules).
- Only **sanitized** text reaches the cloud model.
- Real values are **restored locally** in the answer.
- A **ledger** makes the privacy boundary visible: what stayed, what left, and which model (on-device or cloud) handled each step.

## 3. Target users
- Primary: individuals using AI for personal finance (budgeting, loan/credit questions, tax prep, dispute and complaint letters).
- Secondary: freelancers and small business owners handling invoices and client financial data.

Demo domain (decided): **personal finance**.

## 4. Scope

### Phase 1 — Side-panel private chat (MVP, must ship)
- Chrome side panel with a chat UI.
- Pipeline: chunk, detect (rules + Gemini Nano), mask, review, send sanitized text, answer, restore.
- Review step: user sees masked text with highlighted replacements and can un-mask or add items before sending.
- Answer route is hybrid: simple/short tasks answered on-device when available, otherwise cloud (sanitized text only).
- Ledger panel for each message.
- Settings: strict mode (also mask amounts), custom "always mask" terms, locale packs, enable/disable per entity type.
- Graceful states: model not downloaded (download button with progress), unsupported device (rules-only mode with reduced-confidence banner), offline (on-device only).

### Phase 2 — Guard on third-party AI sites (should ship)
- Supported sites (decided): **chatgpt.com, claude.ai, gemini.google.com**.
- Before the user submits a prompt, intercept, run the same on-device pipeline, show a small preview ("5 items masked"), replace the text in the box on confirm.
- Does not require the Firebase cloud model, since the third-party site is the "cloud"; it uses on-device detection only.
- Optional stretch: restore placeholders in the site's response by observing the DOM.

### Phase 3 — Companion app (only after the extension is complete)
Android and/or iOS companion for multi-platform Grand Prize consideration. Out of scope until Phases 1, 2 and the submission materials are done.

### Non-goals
- No accounts or cloud storage of user content. No sync of user data.
- No image, PDF or audio input in v1 (on-device inference does not support PDF/audio; images are JPEG/PNG only, not planned).
- No guarantee of detecting every sensitive item. We state this honestly in the UI (see threat model).
- No support for browsers other than Chrome desktop.

## 5. Functional requirements

| ID | Requirement | Phase |
|---|---|---|
| F-1 | Detect and mask entity types listed in the system design (cards, accounts, IBAN, tax IDs, emails, phones, names, addresses, DOB, credentials, etc.) | 1 |
| F-2 | Deterministic detectors with validation (Luhn for cards, mod-97 for IBAN) run before and independently of the model | 1 |
| F-3 | Gemini Nano detection via Firebase AI Logic with structured JSON output, `ONLY_ON_DEVICE` | 1 |
| F-4 | Consistent placeholders within a conversation (same value gives the same placeholder) | 1 |
| F-5 | Local vault mapping placeholders to real values, memory/session only | 1 |
| F-6 | Cloud/hybrid answer step receives only sanitized text; each call records `inferenceSource` | 1 |
| F-7 | Restore placeholders locally in answers; handle missing or altered placeholders gracefully | 1 |
| F-8 | User review step before any cloud call, with undo and "mask this too" | 1 |
| F-9 | Ledger per message: counts by type, route per step, `ON_DEVICE`/`IN_CLOUD`, "nothing raw left the device" check result | 1 |
| F-10 | Post-mask safety gate: re-scan sanitized text with deterministic detectors; block the send if any high-confidence item remains | 1 |
| F-11 | Remote Config driven policy (thresholds, enabled types, kill switch) with safe in-code defaults when offline | 1 |
| F-12 | Model availability and download UX | 1 |
| F-13 | Long input handling: chunk for on-device; if still too large, rules-only on the remainder with a visible warning | 1 |
| F-14 | Guard adapters for the 3 sites with preview and confirm | 2 |
| F-15 | Response restore on third-party sites | 2 stretch |

## 6. Non-functional requirements
- **Privacy**: see `03-PRIVACY-THREAT-MODEL.md`. Zero known leaks of structured identifiers in the test corpus (target 0 of N, see test plan).
- **Latency**: rules-only path under 100 ms for typical input; Nano detection under about 5 s for a 1 page message on the dev machine (to be measured, TO VERIFY).
- **Reliability**: every failure mode ends in a safe state (nothing sent) with a clear message.
- **Design**: a complete product feel, not a proof of concept (judging criterion). Empty, loading, error and offline states all designed.
- **Accessibility**: keyboard navigable, sufficient contrast, labels on controls.
- **Free to use**: required by the hackathon.

## 7. Success criteria
1. Meets every hackathon submission requirement (see `07-DEMO-AND-SUBMISSION.md`).
2. Demo shows, in under 3 minutes: raw text, masked text, ledger with on-device/cloud labels, restored answer, and offline behavior.
3. Test corpus recall for structured identifiers (cards, accounts, IBAN, tax IDs, emails, phones) at or near 100%, with the remainder caught by the review step.
4. Works on a clean Chrome profile by following the README.

## 8. Judging map
| Criterion (official) | How this project answers it |
|---|---|
| Technological Implementation | Real hybrid use: `ONLY_ON_DEVICE` for redaction, hybrid routing for answers, `inferenceSource` surfaced, App Check, Remote Config policy, deterministic safety gate |
| Design | Complete side-panel product with review, ledger, settings, and every state designed |
| Potential Impact | Specific audience (people using AI with personal finance data), demonstrated end to end |
| Quality of the Idea | Trust layer in front of AI, a non-obvious use of hybrid inference where the privacy boundary is the feature |
