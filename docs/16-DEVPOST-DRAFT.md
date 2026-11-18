# 16 — Devpost Submission Draft: Field Map, State and Final Texts

The Devpost project is a **draft** (not submitted). This file records what is saved on Devpost as of Nov 18, 2026, what is still missing, and the ready-to-paste final texts. **Do not** put measured numbers, results or features into the text until they exist (doc 06 §5, CLAUDE.md "do not hallucinate").

Rules that govern the fields: `07-DEMO-AND-SUBMISSION.md` §1 to §3 and `08-VERIFY-LIST.md` V-1 to V-17. In particular:
- No production API keys, live Google Cloud secrets, confidential data or PII in the form or the testing instructions [V-11].
- Only a **public YouTube** video link is accepted for the demo (the page text also lists Vimeo, but the rules say YouTube [V-9]; use YouTube). A bare `youtube.com` is rejected and saves as empty [V-52].
- After Nov 30, 2:00 PM PT nothing can be changed [V-2].

## 1. Form map (3 editable steps + Submit)

| Step | Field | Required | State on Nov 18 | Final value / who |
|---|---|---|---|---|
| 1 Project overview | Project name | yes | saved: `Privacy Router` | keep (Q-4) |
| 1 | Elevator pitch (200 chars) | yes | saved (198 chars) | see §2.1 |
| 1 | Thumbnail (3:2, ≤ 5 MB) | no | **missing** | make at T-5.x: simple 3:2 graphic, no third-party logos |
| 2 Project details | About the project (Markdown story) | yes | saved (first version, see §2.3) | replace with §2.3 at the end |
| 2 | Built with (tags, up to 25) | yes | saved: firebase, firebase-ai-logic, gemini-nano, chrome (normalized from chrome-extension), typescript, react, vite, vitest, playwright | add `remote-config`, `app-check`, `firebase-authentication` when implemented |
| 2 | "Try it out" links | yes | saved: GitHub repo | add test-build link when it exists |
| 2 | Image gallery (≤ 15) | no | **missing** | screenshots (synthetic data only) |
| 2 | Demo video URL | yes | **empty** (placeholder rejected) | real public YouTube URL, T-5.3 |
| 3 Additional info | Submitter type | yes | saved: Team | |
| 3 | Country of residence | yes | saved: India | |
| 3 | Organization name | yes (field required) | saved: `N/A (individual team, no organization)` | |
| 3 | Start date (MM-DD-YY) | yes | saved: `11-18-26` | |
| 3 | New or existing | yes | saved: New | |
| 3 | If existing: what already existed | no | blank | stays blank (new) |
| 3 | Platform | yes | saved: Web (Chrome) | |
| 3 | How the project meets the main technology requirement | yes | saved (first version, §2.4) | replace at the end |
| 3 | Demo / test URL | no (strongly encouraged) | blank | extension zip/Release link + setup guide (T-5.4) |
| 3 | Testing instructions | yes (starred in form) | saved (first version, §2.5) | replace at the end |
| 3 | License URL | yes | saved: `https://github.com/Ayush1832/firebase_ai/blob/main/LICENSE` | verify it resolves (repo public, V-53) |
| 3 | Three attestations (age of majority; eligible jurisdiction; not a Contest Entity employee/relative) | yes | **unchecked, to be ticked by the team members themselves** | each of the two members confirms for themselves [V-3] |
| 4 Submit | Terms checkbox + Submit button | yes | not done | the team representative, by end of Nov 29 |
Teammates shown on the project: two members (team of two) [Q-2 answered].

## 2. Final texts (drafts; fill facts only when true)

### 2.1 Tagline (≤ 200 characters)
> Redacts personal financial data on-device with Gemini Nano, sends only sanitized text to the cloud, then restores real values locally. A Chrome extension built on Firebase AI Logic hybrid inference.

### 2.2 Short description for gallery cards (optional, ≤ 1 sentence)
> A Chrome extension that keeps your financial details on your device while you use cloud AI.

### 2.3 About the project (story, Markdown)
Structure (Devpost requires: how Firebase AI Logic is used, features and functionality, value proposition [V-8]). Replace bracketed items with **measured** facts at T-5.2:

```
## Inspiration
People paste bank statements, dispute emails and loan questions into AI chatbots every day. Once sent, names, card numbers, IBANs and account numbers are on someone else's servers. "Just don't paste it" makes AI far less useful. We wanted a way to keep the AI and keep the data local.

## What it does
Privacy Router is a Chrome (Manifest V3) extension that sits in front of AI.
1. Detect on-device. Pattern detectors with checksums (Luhn, IBAN mod-97, Aadhaar Verhoeff) find structured identifiers. Gemini Nano, running in Chrome through Firebase AI Logic, finds names and addresses.
2. Mask. Each value becomes a typed placeholder like [CARD_1]; the real values stay in a local vault (session memory only).
3. Review. A deterministic safety gate re-scans the masked text and the user reviews it before anything leaves the device.
4. Answer. Only the masked text goes to the answer model, routed on-device or to the cloud by policy and connectivity.
5. Restore. Real values are put back locally. A ledger shows which step ran where (ON-DEVICE, CLOUD, RULES) and that raw text did not leave the device.
Two surfaces: a side-panel private chat, and a guard that previews and masks prompts on [N] AI sites before they are sent.

## How we use Firebase AI Logic
- Redaction uses InferenceMode.ONLY_ON_DEVICE: if the on-device model is unavailable the SDK throws instead of falling back to the cloud, so the privacy rule is enforced by the SDK mode. This follows the Firebase team's own guidance to keep sensitive data on-device only and use hybrid or cloud for the rest.
- Answers use hybrid inference (PREFER_ON_DEVICE for simple tasks, cloud for heavier ones) and only ever receive text that passed the safety gate (a branded SanitizedText type plus a lint rule that confines model creation to one module).
- inferenceSource from each response drives the ledger badges.
- App Check protects the AI calls; Remote Config supplies routing policy with offline defaults; anonymous Auth keeps onboarding friction-free.
- Without the on-device model, the extension degrades to rules-only detection with a "reduced confidence" banner and mandatory review. Raw text never goes to the cloud as a fallback.

## Challenges and honest limitations
- Small on-device models miss entities and can be steered by the text they read, so rules always run and the model can only add detections.
- [Measured] recall/precision on our synthetic corpus: [fill from the results table, doc 06 §6]. Free-text names and addresses are the hard part.
- On Google's free Gemini API tier, content sent to the cloud may be used to improve Google products and reviewed by humans. Masking reduces what could be seen but is not perfect, so cloud answers are opt-in behind a consent step and an on-device-only mode is always available.
- Amounts are not masked by default because finance questions need them; strict mode masks them.

## What we learned
[Fill from real spike findings: e.g. ONLY_ON_DEVICE waits for model download; extension constraints.]

## What's next
A companion mobile app reusing the same core engine.

Source, design docs, threat model and test plan: https://github.com/Ayush1832/firebase_ai
```
Do not mention measured numbers or "[N]" sites until they are true. Third-party product names may be mentioned in text where needed (the logo rule concerns the video and images [V-9]), but keep them minimal and factual.

### 2.4 How the project meets the main technology requirement
```
Privacy Router is built on Firebase AI Logic hybrid inference (firebase/ai, getAI with GoogleAIBackend, getGenerativeModel with InferenceMode) and calls it at runtime in src/ai/.
- Redaction: every call that sees raw text uses InferenceMode.ONLY_ON_DEVICE (Gemini Nano in Chrome, structured JSON output via the response constraint).
- Answers: sanitized text only, via PREFER_ON_DEVICE or ONLY_IN_CLOUD chosen by a policy module; response.inferenceSource is recorded in the ledger.
- Other Firebase products: App Check (required), Remote Config (policy with offline defaults), Authentication (anonymous).
Where to look in the repo: src/ai/ (models, redactor, responder), src/core/ (detectors, gate), tests/ (leak test).
```
(Add file names only after they exist.)

### 2.5 Testing instructions (no secrets, V-11)
```
Easiest: watch the demo video; every feature shown is in the repo.
To run it yourself (about 15 minutes):
1. Chrome 139+ on desktop with the on-device AI flags enabled (details in docs/13-SETUP-GUIDE.md); about 22 GB of free disk for Chrome's on-device model.
2. Install the extension: download dist.zip from the repo Releases, unzip, open chrome://extensions, enable Developer mode, Load unpacked.
3. Create a free Firebase project, enable AI Logic, register an App Check debug token and paste your Firebase config and the token into the extension's Options > Advanced (docs/13-SETUP-GUIDE.md). We do not publish our own tokens or keys.
4. Click the toolbar icon, press "Use a sample message" (synthetic data), review, send. No account or payment is required.
Use synthetic data only.
```
(Adjust to reality; if the organizers approve a private token path, mention only that one exists, never the token.)

### 2.6 Thumbnail and gallery plan
- Thumbnail 3:2: product name + a masked/unmasked before-after strip, no third-party logos.
- Gallery (synthetic data only): chat with route badges, review sheet, ledger, onboarding, options (privacy explainer), guard overlay on a mock page, architecture diagram.

## 3. End-of-project procedure (Nov 29)
1. Replace §2.3 to §2.5 texts with the final versions (measured numbers only).
2. Add the YouTube URL (public; verified logged out), thumbnail, gallery images, test-build link, tags.
3. Each team member opens the Additional info step and ticks their own attestations.
4. Open the **Preview** and read it as a judge would; compare against the checklist in doc 07 §3.
5. Verify the repo logged out: public, license visible in About, README run instructions, no secrets (T-4.7), tag `submission-v1`.
6. Representative ticks the terms box and presses **Submit project**. Save the confirmation.
7. Nov 30: re-check only; edits are allowed until the deadline [V-2]; stop pushing to the repo unless fixing a defect.
