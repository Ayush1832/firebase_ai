# 12 — Extension Specification (Manifest, Contexts, Messaging, Storage, Build)

Refines `02-SYSTEM-DESIGN.md` §2, §9, §10 and §12. Labels as in `08-VERIFY-LIST.md`: [V] verified, [TV] to verify, [K] general knowledge not re-checked, [D] our decision.

## 1. Source layout (created at T-0.2)
```
privacy-router/
  manifest.json                 # hand-written (ADR-008); copied to dist/ by the build
  vite.config.ts                # multi-entry
  src/
    core/                       # pure TS (doc 09): detectors, chunker, merge, vault, gate, restorer, policy
    ai/                         # Firebase AI Logic wrapper (doc 10): models, availability, redactOnDevice, answer
    shared/                     # types, constants, message schemas, labels
    extension/
      background/index.ts       # service worker
      sidepanel/                # entry html + main.tsx (engine host + UI)
      options/                  # entry html + main.tsx
      guard/                    # content script + adapters/{chatgpt,claude,gemini}.ts
      firebase/                 # init, appcheck, remoteconfig, auth
    ui/                         # React components, tokens.css
  tests/  fixtures/  scripts/   # synthetic only
  docs/
```
Lint rule: `getGenerativeModel` may only be imported inside `src/ai/` (doc 02 §6). `src/core` may not import `chrome`, `firebase` or `react`.

## 2. Manifest draft (MV3) [D]
```jsonc
{
  "manifest_version": 3,
  "name": "Privacy Router",
  "version": "0.1.0",
  "description": "Mask personal financial data on your device before you use cloud AI.",
  "minimum_chrome_version": "139",          // on-device hybrid needs 139+ [V-20]
  "action": { "default_title": "Open Privacy Router" },
  "side_panel": { "default_path": "sidepanel.html" },   // [V-44]
  "background": { "service_worker": "background.js", "type": "module" },
  "options_page": "options.html",
  "permissions": ["sidePanel", "storage"],
  "content_scripts": [{
    "matches": ["https://chatgpt.com/*", "https://claude.ai/*", "https://gemini.google.com/*"],
    "js": ["guard.js"],
    "run_at": "document_idle"
  }],
  "content_security_policy": { "extension_pages": "script-src 'self'; object-src 'self'" },
  "icons": { "16": "icons/16.png", "32": "icons/32.png", "48": "icons/48.png", "128": "icons/128.png" }
}
```
Notes:
- **No `aiLanguageModelOriginTrial` permission**: it is expired and should be removed [V-40].
- **No `host_permissions`** unless a spike shows they are needed for Firebase endpoints [TV]. Content-script `matches` already scope the guard to three sites. Fewer permissions is a Design and trust signal.
- **No `tabs`, `activeTab`, `scripting`, `contextMenus`, `clipboardRead`** in v1. Add only with a written reason in this section.
- **No remote scripts.** App Check providers that load remote scripts (reCAPTCHA-based) are **not** usable under this CSP [K, TV-3]; use the debug provider or a custom provider.
- `minimum_chrome_version` 139 is from the Firebase hybrid doc [V-20]; the dev machine runs 157 [V-50].
- Guard content script is built as a **single classic script (IIFE)**; content scripts are not ES modules by default [K, TV].
- Firebase network access from extension pages (CORS, `connect-src`) must be confirmed in spike S-1 [TV].

## 3. Contexts and responsibilities

| Context | Owns | Never does |
|---|---|---|
| **Side panel** (React) | Engine host: Firebase init, redactor/responders, pipeline orchestrator, vault, conversation, ledger, UI | Talks to web pages directly |
| **Service worker** | Opens the panel (`action` click, `setPanelBehavior({ openPanelOnActionClick: true })` [V-44]); routes guard messages to the engine host; holds **no** content or secrets; short-lived by design | Runs a model (Prompt API is unavailable in Web Workers [V-41]); stores user text |
| **Options page** (React) | Settings, custom terms, locale packs, privacy explainer, cloud consent, Firebase/App Check advanced fields (§7) | Runs the pipeline |
| **Content script (guard)** | Finds the prompt box, reads/writes text, intercepts submit, shows the preview overlay, sends scan requests | Holds a vault; talks to the page's JS via `postMessage`; calls Firebase |
| **Offscreen document** (only if S-2 passes) | Alternative engine host so the guard works with the panel closed | Exists by default (not planned; offscreen documents cannot be focused and have no AI reason code [V-45]) |

Single-engine rule [D]: only **one** engine host is active at a time; the side panel registers itself on load (`ENGINE_READY`) and unregisters on unload.

## 4. Message protocol (all extension-internal)

Envelope:
```ts
interface Msg<T extends string, P> { v: 1; id: string; type: T; payload: P }
```
Use `chrome.runtime.sendMessage` / `onMessage` with a strict schema validator; unknown `type` is ignored; `sender.id` must equal the extension id, and `sender.tab` is only accepted for guard message types.

| Type | From → To | Payload | Reply |
|---|---|---|---|
| `ENGINE_READY` / `ENGINE_GONE` | panel → background | `{ state: AvailabilityState }` | none |
| `GUARD_SCAN` | content → background → panel | `{ requestId, siteId, text }` **raw text, extension-internal only** | `GUARD_SCAN_RESULT` |
| `GUARD_SCAN_RESULT` | panel → background → content | `{ requestId, status: 'masked'\|'blocked'\|'no-engine'\|'degraded'\|'error', sanitized?: string, counts: Record<EntityType, number>, mode: 'full'\|'rules-only', reduced: boolean, reviewRequired: boolean }` | none |
| `GUARD_CONFIRM` | content → background → panel | `{ requestId, accepted: boolean }` | `GUARD_COMMIT` |
| `OPEN_PANEL` | content → background | `{ reason: 'engine-needed' }` | background calls `sidePanel.open({ tabId })` **inside the user-gesture handler** [V-44, TV-23] |
| `SETTINGS_CHANGED` | options → panel | `{ keys: string[] }` | none |

Rules:
1. Raw text exists in exactly these hops: page DOM → content script → background (in-memory, same tick) → panel. It is never written to storage, logged, or put on `window.postMessage`.
2. `GUARD_SCAN_RESULT.sanitized` is the only text that goes back toward the page, and the guard writes it into the prompt box only after the user confirms.
3. The service worker forwards and forgets; it keeps `requestId → tabId` in memory only.
4. If no engine is registered: the guard shows "Open Privacy Router to scan this prompt" with a button (`OPEN_PANEL`), never silently skips the scan [T-3.5].

## 5. Storage map

| Key | Area | Content | Sensitivity | Lifetime |
|---|---|---|---|---|
| `vault` | `storage.session` | placeholder → surface forms, type | **high** | browser session [V-46] |
| `conversation` | `storage.session` | sanitized messages (placeholders) | medium | browser session |
| `ledger` | `storage.session` | counts, routes, `inferenceSource`, no values | low | browser session |
| `settings` | `storage.local` | strict mode, enabled types, packs, route preference, UI prefs | low | persistent |
| `customTerms` | `storage.local` | user always-mask terms | medium (may be sensitive) | persistent; **never sync, never Firestore** |
| `consent` | `storage.local` | `{ cloudAllowed, acknowledgedAt, version, over18, regionOk }` | low | persistent |
| `onboarding` | `storage.local` | step reached | low | persistent |
| `appCheckDebugToken` | `storage.local` | optional token pasted by a tester, **never bundled** | secret-ish | persistent until cleared; clear button in options |
| `firebaseConfigOverride` | `storage.local` | optional tester-provided Firebase web config | low | persistent |
| `rcCache` | `storage.local` | last Remote Config values | low | persistent |
- `storage.session` is in-memory and is cleared on disable, reload, update and browser restart [V-46]; it is **not exposed to content scripts** by default and we **do not** call `setAccessLevel` to change that [D].
- `QUOTA_BYTES` for session storage is 10,485,760 [V-46]; the vault and conversation are tiny, but writes must handle `lastError`.
- Test L-5 asserts `storage.local` never contains vault values or conversation text.
- Chrome's `storage.sync` is **not used** (sensitive settings must not sync) [D].

## 6. Firebase initialization order (side panel entry) [D; shapes per V-21, V-29]
```ts
const app = initializeApp(cfg);                         // cfg from build env or firebaseConfigOverride
if (debugToken) self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;   // string, or `true` to generate one
                                                                   // (dev builds only; token is logged, register it in console)
initializeAppCheck(app, { provider: /* debug or custom, spike S-3 */, isTokenAutoRefreshEnabled: true });
const ai = getAI(app, { backend: new GoogleAIBackend() });
// Remote Config + anonymous Auth initialize lazily after the first successful screen render.
```
- Set `FIREBASE_APPCHECK_DEBUG_TOKEN` **before** `initializeAppCheck` [V-29].
- The debug token is **never** in the bundle or the repo (V-11). In dev it is generated and registered by hand; for the test build see §7 and TV-18.
- The Firebase `apiKey` in a web config is an identifier, not a secret, but treat it conservatively: restrict the key in Google Cloud console to the needed APIs [K, TV]; do not commit service accounts or `.env` (V-11, `.gitignore` already covers them).

## 7. Judge/tester configuration path (response to TV-18)
Because App Check is enforced for AI Logic [V-29] and the rules forbid live secrets in the repo, form or instructions [V-11], the extension supports **bring-your-own-project** testing:
1. Options page → "Advanced (testers)": fields for a Firebase web config and an App Check debug token (stored in `storage.local`, with a clear button).
2. `docs/13-SETUP-GUIDE.md` explains in about ten minutes how to create a free Firebase project, enable AI Logic, register a debug token and paste both.
3. The video and description show the full flow so judges can score without running it (V-10: judges may skip testing).
4. Separately, ask the organizers whether a pre-registered token delivered through a private channel is acceptable (TV-18, option b). **Do not** put a live token in Devpost fields.
Cost: an extra settings screen (T-2.9 / T-2.8); benefit: the extension is genuinely testable without secrets.

## 8. Guard framework (Phase 3)
```ts
interface SiteAdapter {
  id: 'chatgpt' | 'claude' | 'gemini';
  matches(url: URL): boolean;
  findInput(): HTMLElement | null;                 // the prompt box
  getText(el: HTMLElement): string;
  setText(el: HTMLElement, text: string): void;     // must make the site's editor register the change [TV-11]
  findSubmitControls(): HTMLElement[];              // send button; also Enter key handling
  onSubmitIntercepted(handler: (proceed: () => void) => void): () => void;   // returns unsubscribe
}
```
Flow: user presses Send or Enter → adapter intercepts in the capture phase → `GUARD_SCAN` → overlay shows "N items masked" + Review / Send masked / Send original → on confirm the adapter calls `setText(sanitized)` and lets the submit proceed once.
- **Send original** is allowed (the user owns their data) but requires an explicit second click and is recorded in the local ledger [D].
- Failure behavior: if `findInput()` returns null or the submit cannot be intercepted, show a small "Guard inactive on this page" chip. **Never fail silently** [T-3.5].
- Rich-text editors (ProseMirror, Lexical, contenteditable) need input events and sometimes `execCommand('insertText')` or clipboard paste simulation; each site is a separate spike [TV-11]. Expect selectors to break over time; keep them in one file per site with a version comment and a date.
- Stretch (T-3.7): response restore by a `MutationObserver` on the answer container, replacing placeholders in text nodes using a vault request to the engine.
- Demo caution: the video must avoid third-party logos/trademarks [V-9, TV-20]; plan a mock page or tight crop (doc 07 §5).

## 9. Lifecycle and edge cases
- **Panel closed mid-send:** the pipeline is cancelled; nothing was sent unless the gate had passed and the user confirmed; the conversation in `storage.session` survives.
- **Service worker restarts** (MV3 idle termination): it holds no state beyond transient request maps; the guard retries `GUARD_SCAN` once after a short delay.
- **Multiple windows:** one engine host per extension instance; a second panel shows "Already open in another window" [D].
- **Incognito:** extension disabled in incognito by default [K]; not supported in v1.
- **Update/reload:** `storage.session` is cleared [V-46]; the UI says "Session cleared for your privacy".
- **Offline:** on-device paths work; cloud route disabled with an explicit message; Remote Config uses cached values/defaults.

## 10. Build (Vite) [D, ADR-008]
- Entries: `sidepanel.html`, `options.html`, `background.ts` (ES module), `guard.ts` (**IIFE**, no code splitting), plus static copy of `manifest.json` and icons.
- Output: `dist/` loadable via `chrome://extensions` → Developer mode → Load unpacked. Zip for the test build: `dist.zip` produced by a script.
- Environment: Firebase web config in `.env.local` (git-ignored) with a committed `.env.example`. Build fails if `FIREBASE_APPCHECK_DEBUG_TOKEN` or similar appears in the bundle (grep check in CI, T-4.7).
- TypeScript strict; ESLint with the restricted-import rules; `@types/dom-chromium-ai` for Prompt API typings [V-40 tip], `@types/chrome` for extension APIs.
- No analytics, no remote fonts, no CDN scripts.

## 11. Testing hooks
- `window.__PR_TEST__` is **not** shipped. Tests use dependency injection: the engine takes an `AiPort` (`redact`, `answer`) so a fake can be injected in unit/integration/e2e [doc 06].
- **Playwright and branded Chrome [K, TV-12]:** to my recollection, Chrome 137 and later stopped honoring `--load-extension` in branded Google Chrome builds (a feature flag `DisableLoadExtensionCommandLineSwitch` can be disabled, and Playwright's bundled Chromium still supports the flag). Also, Chromium builds from Playwright may not carry Gemini Nano. Plan: **e2e with a fake AI on Playwright Chromium**; **real Nano checks manually in Google Chrome** (checklist in doc 06 §7). Confirm in T-0.2.
