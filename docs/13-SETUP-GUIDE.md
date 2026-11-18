# 13 — Setup Guide (Firebase, Chrome, Local Environment)

For the project owners and, later, for anyone testing the extension. Steps taken from the Firebase and Chrome docs read on Nov 18, 2026 are marked **[V]** with the doc named; UI labels that were not re-read are marked **[K]** (check against the live console; Firebase moves menus around).

Never put real personal data, App Check debug tokens, service-account keys or `.env` files in the repo [V-11].

## 1. Prerequisites checklist
| Need | Detail | Check |
|---|---|---|
| Google Chrome desktop 139 or newer | On-device hybrid requires it [V-20]. Dev machine has 157.0.8103.79 [V-50]. | `chrome://settings/help` |
| Disk | Chrome's built-in AI needs at least **22 GB free** on the volume holding the Chrome profile; the model is removed if free space drops under 10 GB [V-42]. Dev machine had about 300 GB free [V-50]. | Finder / `df -h` |
| Hardware | GPU with more than 4 GB VRAM, or CPU with 16 GB RAM and 4+ cores [V-42]. Apple M4 / 16 GB [V-50]. | |
| Network for first download | Unmetered connection [V-42]; later offline use works [V-42]. | |
| Google account | To sign in to the Firebase console | |
| Node 20+ and npm | Dev machine has Node v22.14.0 [V-51] | `node -v` |

## 2. Firebase project (task T-0.1, owner action)
Source: Firebase "Build hybrid experiences in Web apps", steps 2 to 4 [V-20..V-29]; menu names [K].

1. Open the Firebase console and **create a new project** (name e.g. `privacy-router-hackathon`). When asked, you **do not need Google Analytics** [V].
2. In the console go to **AI Services > AI Logic** and click **Get started** [V]. Follow the guided workflow:
   - Choose the **Gemini Developer API** provider (recommended by the docs for a no-cost start) [V].
   - Register a **Web app** when prompted and note the `firebaseConfig` object it shows [V]. (Project settings > Your apps also shows it again [K].)
   - The workflow enables the required APIs and **enforces App Check for AI Logic** (Firebase also auto-enforced it for all projects on Nov 2, 2026) [V-29].
3. **Billing decision (Q-8).** The free (Spark) plan means the Gemini API is **Unpaid Services**: Google may use submitted content to improve products and human reviewers may read it [V-35]. Linking Cloud Billing makes it **Paid Services** where prompts are not used to improve products [V-36], but it costs money and $300 trial credits do not apply to the Gemini Developer API [V-30]. Decide before the demo; the app is designed to work with either (cloud consent gate, ADR-013).
4. **Enable Remote Config** (console > Build > Remote Config) and create the parameters in §6 [K].
5. **Enable Authentication** (console > Build > Authentication > Get started > Sign-in method > **Anonymous**) [K].
6. Firestore is optional and not needed for v1 (ADR-010).
7. Send the `firebaseConfig` values (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId) to the build via `.env.local` (git-ignored). These are identifiers, not secrets, but do not paste a service account or any "secret" key anywhere [V-11].
8. Optionally restrict the browser API key in Google Cloud console (APIs & Services > Credentials) to the Firebase APIs used [K, TV].

### 2.1 App Check debug token (task T-0.7; extension context is untested [TV-3])
Source: [V-29].
1. In a dev build, the code sets `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` **before** `initializeAppCheck`.
2. Open the side panel's DevTools console (right-click inside the panel > Inspect). A line like `AppCheck debug token: "123a4567-…"` appears.
3. In the console go to **Security > App Check > Apps**, open the overflow menu for the app, choose **Manage debug tokens** and register the token [V].
4. Confirm that **Security > App Check > APIs** shows AI Logic as **Enforced** [V].
5. Keep the token private. If it is ever pasted into the repo, a form or an issue, **delete it in the console immediately** and register a new one [V-11, V-29].
For testers, the token and config are pasted into the options page (doc 12 §7), never into the repo.

## 3. Chrome setup for on-device AI (task T-0.4, owner action)
Two sources name flags differently (TV-7). Do both checks and note what worked in `08-VERIFY-LIST.md`.
1. Update Chrome to 139+ [V-20].
2. Open `chrome://flags` and set to **Enabled**:
   - `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` (Firebase docs) [V-20].
   - Search for **"Gemma 4 for Built-in AI"** (hackathon FAQ) and enable it if present [V-17].
3. **Relaunch** Chrome [V].
4. Open DevTools (any page) > Console and run `await LanguageModel.availability()`. Expected: `available`, `downloading`, or `downloadable` [V]. If `downloadable`, run `await LanguageModel.create()` to start the download (needs the 22 GB free rule [V-42]); watch progress with a `monitor` callback [V-43]. A download can take several minutes [V-22].
5. Open `chrome://on-device-internals` to see model status and size [V-42]; record the model name and version shown (TV-7).
6. If nothing works: record the exact outputs; the project still runs rules-only (ADR-002), but the demo needs a working machine.

### 3.1 Separate Chrome profile (Q-5)
Create a **new Chrome profile** (profile menu > Add) used only for this project, so the model download, flags and the unpacked extension do not mix with personal browsing. Do not reuse an unrelated automation profile (e.g. the one used by another project's bot).

## 4. Local development environment
Commands do not exist yet; they will be added to `CLAUDE.md` at T-0.2. Expected flow [D]:
```
npm install
cp .env.example .env.local     # fill in firebaseConfig values
npm run build                  # writes dist/
```
Load the extension: `chrome://extensions` > turn on **Developer mode** > **Load unpacked** > choose `dist/`. Click the toolbar icon to open the side panel [V-44].

Reload after each build; `storage.session` is cleared on reload (the vault resets, by design) [V-46].

## 5. Playwright notes
- Playwright is a dev/test tool, not part of the product [ADR-008].
- Automated e2e uses a **fake AI** and Playwright's Chromium (see doc 12 §11); real Nano checks stay manual in Google Chrome [TV-12].
- The existing Playwright-controlled Chrome on this machine (remote debugging port 9334, another project's profile) is used only for the Devpost form. Do not use it for extension testing.

## 6. Remote Config parameters (create at T-2.8; defaults also live in code)
All values must have **safe in-code defaults** so the extension works with Remote Config unreachable (F-11).

| Key | Type | Default | Purpose |
|---|---|---|---|
| `cloud_model` | string | `gemini-3.5-flash-lite` | cloud answer model; the docs' default from SDK v13.0.0 [V-24], but we set it explicitly. Verify availability at T-0.11 [TV-6] |
| `cloud_kill_switch` | boolean | `false` | forces on-device only |
| `ondevice_token_budget` | number | `6000` | prompt budget for on-device answers (limit is 9,216 total [V-27]) |
| `cloud_token_budget` | number | `24000` | history budget for cloud answers |
| `chunk_chars` | number | `1500` | Nano chunk size (tune in S-5 [TV-4]) |
| `chunk_overlap_chars` | number | `150` | |
| `nano_chunk_timeout_ms` | number | `20000` | per-chunk timeout |
| `max_input_chars` | number | `30000` | beyond this, remaining text is rules-only |
| `enabled_entity_types` | JSON | all except AMOUNT | defaults for types |
| `strict_mode_default` | boolean | `false` | ADR-007 |
| `heavy_task_keywords` | JSON array | `["analyze","compare","summarize all","spreadsheet"]` | routing hint [D] |
| `consent_version` | number | `1` | bump to re-ask consent when wording changes |
| `min_chrome_version` | number | `139` | warn below this [V-20] |
Remote Config never carries user data and is fetched with no user content (threat model §3).

## 7. Troubleshooting (grows as spikes run)
| Symptom | Likely cause | Action |
|---|---|---|
| `LanguageModel` is undefined | flag not enabled, Chrome too old, or running in a Worker/service worker [V-41] | check §3; call it only from the side panel page |
| `availability()` returns `unavailable` | hardware/OS/space requirement not met [V-42] | check disk and hardware; read `chrome://on-device-internals` |
| `initializeDeviceModel` error about user activation | called without a click [V-22] | call it from a button handler |
| `ONLY_ON_DEVICE` request "hangs" | model still downloading; request waits [V-22] | show progress; do not call until `ready` (doc 10 §2) |
| AI call rejected / 403 | App Check token not registered or not enforced path mismatch [V-29] | re-register debug token; check console App Check > APIs |
| `429` / rate limit | per-user default 100 RPM or free-tier limits [V-30] | wait; reduce calls |
| Cloud call works but console shows no on-device logs | expected: no monitoring for on-device [V-28] | use the ledger |
