# 08 — Verified Facts, Unverified Assumptions, Open Questions

Update this file whenever a spike or doc check settles something. Never promote an item to VERIFIED without a source or an observed result.

## A. Verified (source noted)

| # | Fact | Source |
|---|---|---|
| V-1 | Deadline Nov 30, 2026 2:00 PM PST; prizes, platforms, criteria, submission requirements as in doc 07 | Devpost page text copied by hand, Nov 18 |
| V-2 | On-device inference on web needs Chrome 139+ and flag `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` set to Enabled, then restart | Firebase AI Logic hybrid web docs (read via fetch agent) |
| V-3 | Development machine: Chrome 157.0.8103.79 on macOS 27.2, Apple M4, 16 GB RAM, ~300 GB free | Checked locally on Nov 18 |
| V-4 | SDK: npm `firebase`, import from `firebase/ai`; on-device hybrid needs v12.5.0+ | Firebase docs |
| V-5 | `getAI(app, { backend: new GoogleAIBackend() })`, `getGenerativeModel(ai, { mode: InferenceMode.X })` with modes `PREFER_ON_DEVICE`, `ONLY_ON_DEVICE`, `PREFER_IN_CLOUD`, `ONLY_IN_CLOUD` | Firebase docs |
| V-6 | `ONLY_ON_DEVICE` throws if on-device is unavailable; `PREFER_*`/`ONLY_IN_CLOUD` requests do not wait for the model download | Firebase docs |
| V-7 | `model.initializeDeviceModel(progressCb)` must be called after/on a user interaction and before queries | Firebase docs |
| V-8 | Response field `inferenceSource` is `ON_DEVICE` or `IN_CLOUD` | Firebase docs |
| V-9 | App Check: `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` before `initializeAppCheck`; register the logged token in the console under App Check, "Manage debug tokens"; App Check is required for AI Logic | Firebase docs |
| V-10 | On-device limits: single-turn text only (plus JPEG/PNG images); max about 9,216 tokens; structured output supported; no function calling, grounding, audio/video/PDF | Firebase docs |
| V-11 | Console AI monitoring shows no data for on-device requests | Firebase docs |

## B. To verify (assumptions that must not be treated as fact)

| # | Assumption | How to verify | Task |
|---|---|---|---|
| TV-1 | Firebase hybrid / Prompt API works inside an MV3 extension side panel | Spike S-1 | T-0.5 |
| TV-2 | Model is not reachable from the service worker; whether an offscreen document works | Spike S-2 | T-0.6 |
| TV-3 | App Check debug flow works in an extension context; which provider is suitable | Spike S-3 | T-0.7 |
| TV-4 | Nano returns valid JSON for entity extraction; latency and best chunk size (initial guess 1,500 chars) | Spike S-5 | T-0.9 |
| TV-5 | Remote Config fetch from an extension and offline defaults | Spike S-6 | T-0.10 |
| TV-6 | Current cloud model id and any version requirements (docs mention a newer default model from JS SDK v13) | Read current docs at scaffold time | T-0.11 |
| TV-7 | Whether "Gemini Nano 4" naming/behavior differs from what the web docs describe (the web docs I read do not mention it) | Check Chrome `chrome://on-device-internals` and the docs | T-0.4 / T-0.5 |
| TV-8 | Chat/multi-turn API availability in hybrid mode for the cloud route | Docs + spike | T-2.1 |
| TV-9 | Streaming (`generateContentStream`) works on-device and in cloud in the extension | Spike | T-2.4 |
| TV-10 | `chrome.storage.session` access from side panel and content scripts | Test | T-1.7 |
| TV-11 | DOM structure and rich-text editor behavior for chatgpt.com, claude.ai, gemini.google.com (selectors, how to set text so the site registers it) | Inspect live pages; expect changes | T-3.2–3.4 |
| TV-12 | Playwright can load the extension in real Chrome with the Nano model available | Try | T-0.2 |
| TV-13 | What the hackathon accepts as a "URL for judging" for an extension | Official Rules / FAQ / Discord | T-5.4 |
| TV-14 | Gemini Developer API data-handling terms to link in the README (no claims until read) | Read terms | T-5.1 |
| TV-15 | Placeholder format survival rate on both models | Eval | T-4.3 |
| TV-16 | Which Android devices support Gemini Nano via Firebase (for the later companion app) | Docs when Phase 6 starts | T-6.1 |
| TV-17 | Prize stacking / multiple awards rule, eligibility and country exclusions | Official Rules page (not yet read) | T-5.6 |

## C. Open questions for the user
Defaults in brackets are what the docs assume unless you say otherwise.

- **Q-1 Firebase project:** do you already have one? [No; create at T-0.1 and share the web config.]
- **Q-2 Team and license holder:** solo? Name to use in the license/README? [Solo, name left as a placeholder.]
- **Q-3 Locale packs:** which countries' IDs matter for the demo and users? [Global + US + IN packs; remove or add as you prefer.]
- **Q-4 Project name:** keep "Privacy Router" or pick a final name? [Keep for now.]
- **Q-5 Chrome profile for testing:** OK to use a separate Chrome profile for the extension and the model download (about a few GB of disk)? [Yes.]
- **Q-6 Repo hosting:** GitHub account to use for the public repo. [Decide before T-5.5.]
- **Q-7 Narration:** who records the video voiceover, and is English narration fine? [You, English.]

## D. Decisions already made by the user
- Product shape: side panel first, then guard.
- Guard sites: ChatGPT, Claude.ai, Gemini.
- No on-device model: rules-only, never raw to cloud.
- Demo domain: personal finance.
- Extension first; Android/iOS app only after the extension is complete.
