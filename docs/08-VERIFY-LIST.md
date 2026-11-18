# 08 — Verified Facts, Unverified Assumptions, Open Questions

Update this file whenever a spike or doc check settles something. **Never promote an item to VERIFIED without a source or an observed result.**

Evidence labels used across all docs:
- **[V]** verified. A source is named in the table below (official page read on the date shown, or a result observed on this machine).
- **[TV]** to verify. An assumption that must be tested or read before code depends on it. Tracked in section B.
- **[K]** general knowledge, not re-checked in this project. Treat as [TV] until a spike or doc check confirms it.
- **[D]** a design decision of ours (not a fact about the world).

All "read" dates below are **Nov 18, 2026**. Docs and terms change; re-read the cited page before relying on a detail late in the project.

## A. Verified facts (source noted)

### A1. Hackathon rules (source: Official Rules page + FAQs page + Resources page on firebasehybridaihackathon.devpost.com, read in a browser Nov 18)

| # | Fact | Source |
|---|---|---|
| V-1 | Contest period: **Nov 11, 2026 1:30 PM PT to Nov 30, 2026 2:00 PM PT** (= 22:00 UTC). Judging: Dec 10, 9:00 AM PT to Dec 16, 2:00 PM PT. Winners on or around Dec 21, 12:00 PM PT. Deadline is fixed; no extension. | Rules §4, FAQ |
| V-2 | After the deadline the submission is locked; commits pushed to the repo after the deadline **will not be evaluated**. Drafts can be saved and edited before the deadline. To keep building afterwards, clone to a new repo and leave the submitted one untouched. | Rules §7, FAQ |
| V-3 | Eligibility: age of majority where you live (20 in Taiwan); **not** a resident of Brazil, Italy, Quebec, Crimea, Cuba, Iran, Syria, North Korea, Sudan, Belarus, Russia or any OFAC-sanctioned country; not Google/Devpost/contest-entity staff or their immediate family or household; not a government agency employee. It is based on country of residence, not citizenship. Every team member must be eligible and be added as a member of the project on Devpost. | Rules §3, §6, FAQ |
| V-4 | Platforms: Web (Chrome; web apps **or Chrome extensions**), Android, iOS. At least one. Multi-platform is preferred but a strong single-platform app can win. Only these three platforms qualify. The submission is associated with the selected platform and organizers may reassign it. | Rules §6, FAQ |
| V-5 | Prizes ($30,000): Grand Prize $10,000 + Interview + Featured Blog Post + Social Media Mention; 1st Runner Up $7,000 + Featured Blog Post + Social Media Mention; 2nd Runner Up $4,000 + Social Media Mention; Best iOS / Best Android / Best Web-Chrome $3,000 each + Social Media Mention. **A submission can win one grand prize and up to one "Best of" category prize.** Non-cash perks have no cash value. | Rules §8-9 |
| V-6 | Judging is two-stage. **Stage One** is pass/fail: includes all Submission requirements, reasonably addresses a challenge, reasonably applies the requirements. **Stage Two**: four equally weighted criteria, each scored 1 to 5, then averaged: Technological Implementation, Design, Potential Impact, Quality of the Idea. Ties are broken by comparing criterion scores in that order, then by judge vote. | Rules §8 |
| V-7 | The four criteria questions (verbatim intent): Tech Implementation = how well built and how effectively it uses Firebase AI Logic **hybrid inference**; Design = complete coherent product, not a proof of concept; Potential Impact = credible specific case for a real problem and real audience, based on what is demonstrated; Quality of the Idea = creative non-obvious use of Firebase AI Logic and genuine understanding of the problem space. | Rules §8 |
| V-8 | Required in the submission: platform selection; text description (how Firebase AI Logic is used, features and functionality, value proposition); public GitHub/GitLab repo with all source, assets, run instructions, value proposition, and Firebase AI Logic **imported and actually called at runtime**; an open-source license file visible in the repo About section (Apache preferred, any OSI license accepted); demo video. | Rules §6 |
| V-9 | Demo video: shows the project working on the target platform; max 3 minutes (only the first 3 minutes may be evaluated); **public on YouTube**, link on the form; English or English subtitles. FAQ: "Avoid third-party logos, trademarks, or content you don't have rights to." Rules also forbid content displaying third-party advertising, slogan, logo, trademark or implying third-party sponsorship/endorsement. FAQ advice: upload early because YouTube processing can take hours; first 30 seconds should show who it is for, the problem, and how Firebase AI Logic makes it work. | Rules §6, FAQ |
| V-10 | Testing: provide a link to a website, functioning demo or test build (a hosted URL, web app, Chrome extension or test build are all named as acceptable; hosting is strongly encouraged, not required). The project must be available free of charge and without restriction to Sponsor, Administrator and Judges until the judging period ends (Dec 16). **Judges are not required to test and may judge on text, images and video alone.** | Rules §6, FAQ |
| V-11 | **Entrants must not include production API keys, live Google Cloud project secrets, confidential commercial data or PII within the repository, the submission form, or the testing instructions.** FAQ adds: never commit App Check debug tokens, service-account keys or `.env` files to the public repo. | Rules §6, FAQ |
| V-12 | Firebase AI Logic requires App Check; **debug tokens are accepted in submissions**. Firebase products other than AI Logic (App Check, Remote Config, Firestore, Auth) are encouraged, optional. All AI inference should go through Firebase AI Logic (do not call other model APIs directly). | Rules §6, FAQ |
| V-13 | Firebase wants to see both on-device and cloud inference; judges score how effectively hybrid inference is used. FAQ explicitly endorses: "keep sensitive data on-device only and use hybrid or cloud for other features" and that different features can use different inference modes (one model instance per configuration). | FAQ |
| V-14 | Projects must be new, or significantly updated after Nov 11. Disclose any pre-existing code; frameworks, libraries, templates and AI coding assistants are allowed. Third-party SDKs/APIs/data require authorization under their terms. A team's cash prize is paid to the appointed Representative. | Rules §6, §9, FAQ |
| V-15 | IP: entrant keeps ownership; grants Google and partners a perpetual, irrevocable, worldwide, royalty-free, non-exclusive license to use the Project for contest purposes. Publicity: entrant consents to use of name, likeness, voice, hometown and country of residence for promotion. Winners must sign an eligibility/liability/publicity declaration (10 business days) and respond to notification within 3 business days. Disputes go to JAMS arbitration (San Jose, CA). | Rules §12-21 |
| V-16 | Google Account Quota: 3 sprints; Sprint 2 request deadline Wed Nov 18 10:00 AM PT (account sent Nov 19); Sprint 3 (final) request deadline Wed Nov 25 10:00 AM PT (account sent Nov 27). Each account lasts 4 days. Requires ID verification. **All required tools (Firebase AI Logic, Gemini Nano 4) work on the free tier**; the quota accounts are only for billing-required models (e.g. image generation). Not needed for a text-only design. | Rules §5, Resources |
| V-17 | The rules text names the web on-device model "Gemini Nano 4". The Firebase and Chrome docs call it "the on-device model / Gemini Nano". FAQ says to enable the Chrome flag **"Gemma 4 for Built-in AI"** (search chrome://flags). A Devpost thread quotes a Firebase answer (via Discord, second-hand) that Chrome's downloaded component named `v3Nano` is acceptable "as long as the model is being accessed via the Firebase AI Logic SDK", and that the "Gemma 4 on built-in AI" flag may be needed. | FAQ; discussion 45895 (second-hand) |

### A2. Firebase AI Logic (source: firebase.google.com/docs/ai-logic pages listed, doc banner "Last updated 2026-11-18")

| # | Fact | Source page |
|---|---|---|
| V-20 | On-device inference needs Firebase AI Logic **JS SDK v12.5.0+** and **Chrome desktop 139+**. npm package `firebase`, import from `firebase/ai`. | hybrid/web/get-started |
| V-21 | Setup shape: `initializeApp(config)`; `getAI(app, { backend: new GoogleAIBackend() })`; `getGenerativeModel(ai, { mode: InferenceMode.X })`. Modes: `PREFER_ON_DEVICE`, `ONLY_ON_DEVICE` (throws if on-device is unavailable), `PREFER_IN_CLOUD`, `ONLY_IN_CLOUD` (throws if cloud unavailable). | hybrid/web/get-started, configuration-options |
| V-22 | `model.initializeDeviceModel(progressCb)` must be called **after or on an end-user page interaction** (e.g. button click) and before any queries. **Correction to an earlier version of this file:** with `ONLY_ON_DEVICE`, a request made before the download finishes **waits until the download completes** (can take several minutes) and then runs on-device. With `PREFER_ON_DEVICE` / `PREFER_IN_CLOUD` the request does not wait and falls back to cloud; `ONLY_IN_CLOUD` goes to cloud. | hybrid/web/get-started step 6 |
| V-23 | `result.response.inferenceSource` is `ON_DEVICE` or `IN_CLOUD` (since JS SDK v12.5.0). | configuration-options |
| V-24 | Default cloud model is `gemini-3.5-flash-lite` **starting with JS SDK v13.0.0**; override with `inCloudParams: { model }`. The banner lists current model names (gemini-4-hydrogen, gemini-3.8-flash, gemini-3.5-flash-lite, gemini-nano-banana-2.1) and says Gemini 2.5 models are deprecated (Gemini Developer API requests to 2.5 Flash/Pro are auto-routed to newer models from Dec 1, 2026). A page exists for changing the model name remotely (Remote Config); not yet read in detail. | configuration-options, banner |
| V-25 | On-device config: `onDeviceParams: { createOptions: { expectedInputs, expectedOutputs, initialPrompts: [{ role: 'system', content: [{ type: 'text', value }] }] }, promptOptions: { responseConstraint } }`. Cloud config: `inCloudParams: { model, generationConfig: { responseMimeType, responseSchema, maxOutputTokens, stopSequences } }`. Config lives for the lifetime of the model instance; use a new instance for a different config. | configuration-options, hybrid structured output |
| V-26 | Structured output works on-device and in cloud. For hybrid, configure both: on-device `onDeviceParams.promptOptions.responseConstraint` (Firebase `Schema` helper or plain JSON schema) and cloud `inCloudParams.generationConfig.responseMimeType: 'application/json'` + `responseSchema`. | hybrid/web/generate-structured-output |
| V-27 | On-device supports only **single-turn** text (and JPEG/PNG image) generation, streaming or not, structured output including JSON and enums. Max **9,216 tokens**. Not supported on-device: multi-turn chat (ONLY_ON_DEVICE throws), tools (function calling, code execution, URL context, grounding), audio/video/PDF input, image generation, URL file inputs. Not supported for hybrid at all: Live API, server prompt templates; **count tokens should not be relied on** (differs between models). | hybrid/web/get-started |
| V-28 | Console AI monitoring shows no data for on-device inference. | hybrid/web/get-started |
| V-29 | **On Nov 2, 2026 Firebase auto-enforced App Check for AI Logic in all projects.** For local development use the debug provider: set `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` before `initializeAppCheck`, copy the logged token, register it in console under App Check > Apps > Manage debug tokens. Keep the token private, never commit it. Shipping to end users needs a production attestation provider. | hybrid/web/get-started, app-check |
| V-30 | Gemini Developer API is available on the no-cost Spark plan and on Blaze. Per-user request limit default is 100 requests per minute (configurable). Free-tier rate limits are explicit. $300 free-trial credits cannot be used for the Gemini Developer API. | faq-and-troubleshooting |
| V-31 | Firebase AI Logic use is governed by the Google Cloud Platform Terms plus the Gemini API Additional Terms; for an unlinked-billing (Spark) project, the "Unpaid Services" terms apply. | data-governance |

### A3. Gemini API Additional Terms (source: ai.google.dev/gemini-api/terms, read Nov 18)

| # | Fact |
|---|---|
| V-35 | **Unpaid Services** (unpaid quota on Gemini API): Google uses submitted content and responses to provide, improve and develop Google products and ML technologies; **human reviewers may read, annotate and process input and output** (disconnected from account, key and project first). The terms say: "Do not submit sensitive, confidential, or personal information to the Unpaid Services." |
| V-36 | **Paid Services** (Gemini API accessed through a Cloud project with active billing): Google does not use prompts or responses to improve its products; processed under the Data Processing Addendum; prompts and responses are logged for a limited period for abuse detection. |
| V-37 | Age: you must be 18+ to use the APIs, and must not use the Services as part of an application "directed towards or likely to be accessed by individuals under the age of 18". |
| V-38 | Region: **"You may use only Paid Services when making API Clients available to users in the European Economic Area, Switzerland, or the United Kingdom."** For people in the EEA/CH/UK the paid-services data terms apply even to unpaid quota. |
| V-39 | The terms describe the Services as for developers building for "professional or business purposes, not for consumer use" (read as context for the hackathon, not interpreted legally here). |

### A4. Chrome built-in AI and extension APIs (source: developer.chrome.com pages, read Nov 18)

| # | Fact | Source |
|---|---|---|
| V-40 | The **Prompt API is documented for Chrome Extensions** (page has an Extensions tab). In extensions, legacy `topK`/`temperature` and `LanguageModel.params()` exist (set both or neither). The expired origin-trial permission `aiLanguageModelOriginTrial` should be removed from manifests. | developer.chrome.com/docs/ai/prompt-api |
| V-41 | The Prompt API is available to **top-level windows and same-origin iframes only**, and is **not available in Web Workers**. Cross-origin iframes need the `allow="language-model"` Permission Policy. | prompt-api |
| V-42 | Hardware/OS for built-in models: macOS 13+, Windows 10/11, Linux, ChromeOS Plus; **at least 22 GB free** on the profile volume; GPU with more than 4 GB VRAM, or CPU with 16 GB RAM and 4+ cores; unmetered network for the initial download. The model is removed if free space falls below 10 GB. Model use needs no network and "no data is sent to Google or any third party". Current size: `chrome://on-device-internals`. | prompt-api |
| V-43 | Chrome Prompt API: `LanguageModel.availability()`, `LanguageModel.create({ monitor })` (needs user activation to trigger download), sessions with `contextUsage` / `contextWindow`, `contextoverflow` event, `QuotaExceededError { requested, contextWindow }`, `responseConstraint` (JSON Schema or regex) which **consumes context window** unless `omitResponseConstraintInput: true`, `AbortSignal` support, `session.clone()`, `session.destroy()`. Output is text only. | prompt-api |
| V-44 | `chrome.sidePanel`: Chrome 114+; `sidePanel.open()` Chrome 116+ and needs a user gesture (action click, keyboard shortcut, context menu, **a user gesture on an extension page or content script**); `setPanelBehavior({ openPanelOnActionClick: true })`; per-tab `setOptions`. | extensions/reference/api/sidePanel |
| V-45 | `chrome.offscreen`: Chrome 109+; static bundled HTML only; **only one offscreen document open at a time**; **cannot be focused**; `opener` is null; creation needs a `reason` (list includes AUDIO_PLAYBACK, IFRAME_SCRIPTING, DOM_SCRAPING, BLOBS, DOM_PARSER, USER_MEDIA, DISPLAY_MEDIA, WEB_RTC, CLIPBOARD, LOCAL_STORAGE, WORKERS, BATTERY_STATUS, MATCH_MEDIA, GEOLOCATION; **no AI/model reason**) and a justification. | extensions/reference/api/offscreen |
| V-46 | `chrome.storage.session`: held **in memory**, cleared when the extension is disabled, reloaded, updated, and when the browser restarts; **not exposed to content scripts by default** (can be changed with `setAccessLevel('TRUSTED_AND_UNTRUSTED_CONTEXTS')`); `QUOTA_BYTES` = 10,485,760. `storage.local` limit 10 MB (more with `unlimitedStorage`). | extensions/reference/api/storage |

### A5. Observed locally

| # | Fact | Source |
|---|---|---|
| V-50 | Dev machine: Chrome **157.0.8103.79** on macOS 27.2 (Darwin 27.2.0), Apple M4, 16 GB RAM, about 300 GB free disk. Meets the V-42 hardware bar on paper (not yet tested). | Checked Nov 18 |
| V-51 | Node v22.14.0, npm available; `playwright-core` installs from npm. A Playwright-controlled Chrome with remote debugging on port 9334 is running (profile from another project, **not** to be reused for this extension; use a separate profile, see doc 13). | Checked Nov 18 |
| V-52 | Devpost project draft exists for this entry. Step 1 and parts of steps 2 and 3 are saved. See `docs/16-DEVPOST-DRAFT.md`. Devpost rejects a bare `youtube.com` as the video URL (field saved empty), and normalizes the "chrome-extension" tag to "chrome". | Observed Nov 18 |
| V-53 | The repository `github.com/Ayush1832/firebase_ai` is public with an Apache-2.0 `LICENSE` committed (`e4f4505`). GitHub's license API reports **Apache-2.0** for `LICENSE` (checked Nov 18 after the push; `gh repo view` briefly showed null while indexing). Visual check of the About section while logged out is still to do. | Observed Nov 18 |

## B. To verify (assumptions that must not be treated as fact)

Status column: **open**, **partly settled** (docs reduce risk but a test is still needed), **settled** (moved to section A).

| # | Assumption | How to verify | Task | Status |
|---|---|---|---|---|
| TV-1 | Firebase hybrid SDK + Chrome Prompt API work inside an MV3 extension **side panel** page. Chrome documents the Prompt API for extensions (V-40) and top-level extension pages are windows; the Firebase SDK wrapper on top of it in an extension is untested. | Spike S-1 | T-0.5 | partly settled |
| TV-2 | The model is not reachable from the service worker (documented for Web Workers, V-41; a service worker is a worker type); whether an **offscreen document** can run the model, and whether `initializeDeviceModel` can get "user activation" there (offscreen documents cannot be focused, V-45). | Spike S-2 | T-0.6 | partly settled (SW out) |
| TV-3 | App Check debug flow works in an extension context (origin `chrome-extension://…`); whether a **production provider** is possible for an extension at all (reCAPTCHA-based providers expect web origins). App Check is already enforced (V-29). | Spike S-3 | T-0.7 | open |
| TV-4 | Nano returns valid JSON for entity extraction with a response constraint; latency; best chunk size (initial guess 1,500 chars); how many tokens the schema itself consumes (V-43). | Spike S-5 | T-0.9 | open |
| TV-5 | Remote Config fetch from an extension, caching, and offline defaults. | Spike S-6 | T-0.10 | open |
| TV-6 | Cloud model id and SDK version. **Docs-level settled:** default `gemini-3.5-flash-lite` from SDK v13.0.0 (V-24). Remaining: pick the SDK version at scaffold time, set the model **explicitly** (do not rely on the default), confirm free-tier availability and rate limits of that model, and read the Remote Config model-name page. | Read at scaffold; call once | T-0.11 | partly settled |
| TV-7 | Which Chrome flags are required. Sources disagree in wording: Firebase docs name `#prompt-api-for-gemini-nano-multimodal-input`, the hackathon FAQ names "Gemma 4 for Built-in AI" (V-17). Find which are needed on Chrome 157, and what `chrome://on-device-internals` reports as the model name/version. | Hands-on | T-0.4 | open |
| TV-8 | Multi-turn chat in hybrid. **Decision [D] removes the need:** both routes get a single flattened prompt (V-27 says on-device is single-turn). Cloud chat API can be revisited as an optimization. | n/a | T-2.1 | settled by design |
| TV-9 | Streaming (`generateContentStream`) works on-device and in cloud inside the extension. | Spike | T-2.4 | open |
| TV-10 | `chrome.storage.session` use from side panel / options / background. **Docs-level settled:** in-memory, cleared on restart, not exposed to content scripts unless access level is changed (V-46). Remaining: confirm behavior and decide whether content scripts ever need it (design says no). | Test | T-1.7 | partly settled |
| TV-11 | DOM structure and rich-text editor behavior of chatgpt.com, claude.ai, gemini.google.com (selectors, how to set text so the site registers it). Expect breakage over time. | Inspect live pages | T-3.2 to T-3.4 | open |
| TV-12 | Playwright can load the extension in real Chrome with the Nano model available (persistent context, headed, `--load-extension`, real Chrome channel). | Try | T-0.2 / T-2.x | open |
| TV-13 | What counts as a testable URL for an extension. **Settled:** a Chrome extension or test build is explicitly acceptable (V-10). Remaining: how judges can run it under enforced App Check without us putting live secrets in the repo, form or instructions (see TV-18). | Rules read | T-5.4 | partly settled |
| TV-14 | Gemini Developer API data terms. **Settled** (V-35 to V-39). Remaining: README/UI wording that states the free-tier exposure honestly. | Done | T-5.1 | settled (wording open) |
| TV-15 | Placeholder format survival rate on both models. | Eval | T-4.3 | open |
| TV-16 | Which Android devices support Nano via Firebase (later companion app). The hackathon FAQ lists Pixel 10/11, Galaxy S26+, Z Fold8 and Z Flip8 as examples; get a second source from the Android docs before relying on it. | Docs when Phase 6 starts | T-6.1 | open |
| TV-17 | Prize stacking and eligibility. **Settled** (V-3, V-5). | Done | T-5.6 | settled |
| TV-18 | **Judge testability under enforced App Check.** Rules forbid live project secrets in the repo, form or testing instructions (V-11) but say debug tokens are accepted (V-12) and judges may skip testing (V-10). Options to evaluate: (a) rely on video + text and offer a test build that needs the tester's own Firebase config and debug token (documented), (b) ask organizers whether a pre-registered debug token delivered privately is acceptable, (c) find a production App Check provider that works for an extension. | Spike S-3 + ask in Devpost discussions / Discord | T-0.7, T-5.4 | open |
| TV-19 | EEA/UK/Switzerland and under-18 restrictions of the free tier (V-37, V-38) vs "free judge access". Another entrant asked this on Devpost (thread 45919) with no answer yet. Design response [D]: consent gate + on-device-only mode, see ADR-013. | Watch the thread; ask | T-2.7 | open |
| TV-20 | Whether showing chatgpt.com / claude.ai / gemini.google.com UI in the demo video violates the "no third-party logos or trademarks" rule (V-9). Mitigation options: blur logos, record the guard on a local mock page, show only the text box area. Ask organizers if unsure. | Ask; decide at T-5.3 | T-5.3 | open |
| TV-21 | Exact JS SDK version to pin (v12.5+ for hybrid; v13+ for the new default model) and whether option names (`onDeviceParams`, `inCloudParams`, `promptOptions`, `createOptions`) are identical in the version installed. Read the changelog at scaffold time. | Scaffold | T-0.2 / T-0.11 | open |
| TV-22 | Gemini Nano context window as seen through Chrome (`session.contextWindow`) vs the 9,216 token figure in the Firebase docs; whether the schema consumes part of it. | Spike S-5 | T-0.9 | open |
| TV-23 | `chrome.sidePanel` + `sidePanel.open()` from a content-script gesture works on the three guard sites (V-44 says a content-script user gesture counts). | Spike S-2b | T-3.1 | open |
| TV-24 | How the side panel handles user activation for `initializeDeviceModel` and the Chrome `monitor` download when the panel opens by clicking the action icon (gesture on the panel page itself is guaranteed by a button; test that). | Spike S-1 | T-0.5 | open |

## C. Open questions for the user
Defaults in brackets are what the docs assume unless you say otherwise.

| # | Question | Status / default |
|---|---|---|
| Q-1 | Firebase project: created? Please share the web `firebaseConfig`. | Open. [No; create at T-0.1 following `docs/13-SETUP-GUIDE.md`.] |
| Q-2 | Team: **answered**: two members registered on the Devpost project. Who is the appointed Representative (receives any prize and signs declarations)? | Partly answered. [The account that owns the Devpost project.] |
| Q-3 | Locale packs: country of residence is India, so the `IN` pack is a clear yes. | Mostly answered. [GLOBAL + US + IN.] |
| Q-4 | Final project name. | Open. [Keep "Privacy Router"; already entered on Devpost.] |
| Q-5 | OK to use a **separate Chrome profile** for the extension and the model download (the model needs about 22 GB free during download, V-42)? | Open. [Yes.] |
| Q-6 | Repo hosting: **answered**: `github.com/Ayush1832/firebase_ai` (public). | Answered. |
| Q-7 | Who records the narration; English is required (or subtitles). | Open. [User, English.] |
| Q-8 | **Billing.** Do you want to link a Cloud Billing account (Blaze) so the Gemini Developer API counts as **Paid Services** (no use of prompts for product improvement, V-36)? It costs real money per use (small for this demo; the $300 trial credit does not apply, V-30). If not, the Spark/unpaid terms apply (V-35) and the docs/UI must say sanitized prompts may be used to improve Google products and reviewed by humans. | Open. [Stay on the free tier, disclose clearly, keep cloud route behind a consent gate (ADR-013).] |
| Q-9 | Division of work between the two team members (who builds what, who records the video)? | Open. |
| Q-10 | Do you have a second Chrome-capable machine (Windows/Linux) to test the "no Nano" experience? | Open. [Simulate by disabling the flags.] |

## D. Decisions already made by the user
- Product shape: side panel first, then guard.
- Guard sites: ChatGPT, Claude.ai, Gemini.
- No on-device model: rules-only, never raw to cloud.
- Demo domain: personal finance.
- Extension first; Android/iOS app only after the extension is complete.
- Repo: `github.com/Ayush1832/firebase_ai`; push all work there.
- Team of two; country of residence India.

## E. Corrections log (mistakes found in earlier versions of these docs)
| Date | Was | Now | Source |
|---|---|---|---|
| Nov 18 | "Grand Prize and 1st runner-up also include an interview" | Interview is **Grand Prize only**; 1st runner-up gets Featured Blog Post + Social Media Mention | Rules §9 |
| Nov 18 | V-6: "`ONLY_ON_DEVICE` throws if unavailable; PREFER_*/ONLY_IN_CLOUD do not wait for the download" (incomplete) | `ONLY_ON_DEVICE` **waits** for an in-progress download (minutes) and throws only if on-device is unavailable | hybrid get-started step 6 |
| Nov 18 | Only one Chrome flag documented | Two names appear (Firebase docs vs hackathon FAQ); both must be checked (TV-7) | FAQ + docs |
| Nov 18 | "Gemini cloud terms not read" | Read; free tier allows product-improvement use and human review (V-35) | Gemini API terms |
| Nov 18 | Task T-0.3 / README said license planned | `LICENSE` committed; GitHub license API reports Apache-2.0 | git, GitHub API |
