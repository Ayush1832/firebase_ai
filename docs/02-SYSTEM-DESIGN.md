# 02 — System Design

Legend: **[V]** verified from official docs/Devpost text, **[TV]** TO VERIFY by a spike or docs check (tracked in `08-VERIFY-LIST.md`).

## 1. Overview

```
 User text
    │
    ▼
┌────────────┐   ┌──────────────────────────────────────────────┐
│  Chunker   │──▶│ Layer 1: Deterministic detectors (rules)     │  always runs
└────────────┘   └──────────────────────────────────────────────┘
                              │ spans
                              ▼
                 ┌─────────────────────────────────────┐
                 │ Layer 2: Gemini Nano detector        │  ONLY_ON_DEVICE, JSON output
                 │ (Firebase AI Logic)                  │  skipped if unavailable
                 └─────────────────────────────────────┘
                              │ spans
                              ▼
                 ┌─────────────────────┐   ┌───────────┐
                 │ Merge + Masker      │──▶│  Vault    │ placeholder ↔ real value
                 └─────────────────────┘   │ (memory/  │ never leaves the device
                              │            │ session)  │
                              ▼            └───────────┘
                 ┌─────────────────────┐
                 │ Safety gate         │ re-scan sanitized text; block if anything high-confidence remains
                 └─────────────────────┘
                              │ sanitized text
                              ▼
                 ┌─────────────────────┐
                 │ User review         │ edit masks, add items
                 └─────────────────────┘
                              │ confirmed sanitized text
                              ▼
                 ┌─────────────────────┐
                 │ Router (policy)     │ simple → on-device, else cloud
                 └─────────────────────┘
                     │             │
             PREFER_ON_DEVICE   cloud (Gemini via Firebase AI Logic)
                     └─────┬───────┘
                           ▼  answer with placeholders
                 ┌─────────────────────┐
                 │ Restorer (local)    │ placeholders → real values via vault
                 └─────────────────────┘
                           ▼
                 Answer shown + Ledger entry
```

Core property: **the only text that can reach the cloud is the output of the Safety gate.** Enforced structurally (see §6).

## 2. Extension contexts (Manifest V3)

| Context | Role | Notes |
|---|---|---|
| Side panel page (React) | Hosts the chat UI **and the AI engine** (Firebase SDK, redaction, routing) | Chosen because it is a normal document with user interaction available, and `initializeDeviceModel` must be called after a user interaction [V]. Whether the Prompt API / Firebase hybrid works inside an extension side panel is **[TV] spike S-1** |
| Background service worker | Opens side panel, handles context menu and shortcuts, routes messages from content scripts to the side panel/offscreen engine, holds no sensitive state | Service workers may not expose `LanguageModel` **[TV]**; do not plan to run the model there |
| Offscreen document (fallback) | Alternative engine host if the side panel cannot be used from content-script flows (guard works while the panel is closed) | Only if spike S-2 shows it is needed and works **[TV]** |
| Content scripts (phase 2) | Per-site adapters: find the prompt box, read/write text, intercept submit, show the preview UI | Matches only the 3 supported hosts. DOM selectors **[TV]** per site, expect breakage over time |
| Options page | Settings, custom terms, locale packs, privacy explainer | |

Message flow for the guard: content script ⇄ background ⇄ engine host (side panel or offscreen). Messages carry raw text between **local extension contexts only**; they never cross to a web page's JS (content script must not expose raw text to the page's main world) and are never sent over the network.

## 3. Data model (TypeScript sketch)

```ts
type EntityType =
  | 'PERSON' | 'ORG' | 'EMAIL' | 'PHONE' | 'ADDRESS' | 'DOB'
  | 'CARD_NUMBER' | 'ACCOUNT_NUMBER' | 'IBAN' | 'ROUTING_OR_IFSC'
  | 'TAX_ID' | 'GOV_ID' | 'UPI_ID' | 'TXN_ID'
  | 'CREDENTIAL' | 'API_KEY'
  | 'AMOUNT'        // off by default; strict mode only
  | 'CUSTOM';       // user-defined always-mask terms

interface Span {
  type: EntityType;
  start: number; end: number;        // offsets in the chunk/original text
  source: 'rule' | 'nano' | 'user';
  confidence: 'high' | 'medium' | 'low';
}

interface VaultEntry { placeholder: string; value: string; type: EntityType }   // session memory only
interface MaskResult { sanitized: string; spans: Span[]; vaultDelta: VaultEntry[]; mode: 'full' | 'rules-only' }
interface LedgerEntry {
  id: string; ts: number;
  counts: Partial<Record<EntityType, number>>;      // counts only, never values
  steps: { name: 'detect'|'answer'; route: 'ON_DEVICE'|'IN_CLOUD'|'RULES'; model?: string }[];
  rawLeftDevice: false;                              // invariant, asserted by the gate
  mode: 'full' | 'rules-only';
}
```

Locale packs (decided default, **open question Q-3**): `GLOBAL` (cards, IBAN, email, phone E.164) plus `US` (SSN, routing numbers) and `IN` (PAN, Aadhaar, IFSC, UPI). Packs are data (patterns + validators + context keywords), so more can be added without touching the engine.

Placeholder format: `[TYPE_n]` e.g. `[PERSON_1]`, `[ACCOUNT_2]`. Same real value in one conversation gets the same placeholder. Whether cloud and on-device models preserve the exact tokens is measured in eval (metric: placeholder survival rate) **[TV]**.

## 4. Detection

### Layer 1 — deterministic (always on, no AI)
- Regex plus validators: Luhn (cards), mod-97 (IBAN), format checks per locale pack (SSN, PAN, Aadhaar with Verhoeff checksum, IFSC), email, phone, URLs with tokens, common API key shapes.
- Context-keyword boosting for ambiguous digit runs ("account", "a/c", "acct", "routing").
- Custom user terms (exact match, case-insensitive).
- Output: spans with confidence. Cards/IBAN passing checksums are `high`.

### Layer 2 — Gemini Nano (on-device) via Firebase AI Logic
- `getGenerativeModel(ai, { mode: InferenceMode.ONLY_ON_DEVICE })` plus structured JSON output with a response schema [V: structured output supported on-device]. Single-turn text only [V]. Max about 9,216 tokens per request [V], so the chunker uses a conservative size (initial guess ~1,500 characters per chunk with overlap, **[TV]** tune by measurement).
- Task: find names, organizations, addresses, DOBs, and items the rules cannot pattern-match. The prompt asks for **exact substrings**; the engine maps substrings back to offsets itself (never trusts model offsets). Any returned substring not found verbatim in the chunk is discarded.
- Model output is untrusted input: parsed with a strict schema validator, failures are treated as "model produced nothing" (not as "text is clean").
- Layer 2 can only **add** spans. It can never remove or downgrade a rule-detected span.

### Merge
Union of spans, resolve overlaps (longest wins, `high` confidence beats lower), then mask right-to-left to keep offsets valid.

### Degraded modes
| Condition | Behavior |
|---|---|
| Nano not downloaded | Offer download button (user interaction needed [V]); meanwhile rules-only |
| Nano unsupported / throws | `mode: 'rules-only'`, banner "reduced confidence", review step is mandatory |
| Chunk too large | Chunk; if a chunk still fails, rules-only for that chunk with a visible marker |
| Gate finds a leftover high-confidence item | Block send, highlight the item, ask the user |

## 5. Answer routing

- Inputs: sanitized text only.
- Policy (Remote Config values with local defaults): estimated token count, task hints (e.g. "summarize", "calculate"), on-device availability, online status, user override ("always cloud" / "always on-device").
- Calls: `getGenerativeModel(ai, { mode })` where mode is `PREFER_ON_DEVICE` for short/simple, `ONLY_IN_CLOUD`/`PREFER_IN_CLOUD` for heavy work [V modes exist]. After each call read `result.response.inferenceSource` (`ON_DEVICE` | `IN_CLOUD`) [V] and write it to the ledger.
- On-device is **single-turn** [V], so for on-device answers the engine flattens recent sanitized history into one prompt. Cloud calls can use multi-turn (**[TV]** confirm chat API in hybrid mode).
- The cloud default model and exact model names must be read from docs at build time, not hard-coded from memory **[TV]**.

## 6. Structural guarantees (how rule 1 is enforced)

1. The AI wrapper exposes two typed functions only: `redactOnDevice(raw: RawText)` (always `ONLY_ON_DEVICE`) and `answer(sanitized: SanitizedText)`.
2. `SanitizedText` is a branded type that only the Safety gate can produce. `answer()` does not accept `string`.
3. Lint rule / unit test fails the build if `getGenerativeModel` is called outside `src/ai/`.
4. Leak test L-1 (see test plan) runs the whole pipeline with a network spy and asserts that no outbound request body contains any seeded raw value.

## 7. Restore
- Replace `[TYPE_n]` tokens in the answer using the vault. Exact match first, then tolerant matching for common model alterations (spacing, case, markdown escaping) **[TV]** measured in eval.
- Unknown placeholders are left as is and flagged.
- Placeholders in the answer that are not in the vault are never "guessed".

## 8. Firebase usage

| Product | Use | Status |
|---|---|---|
| AI Logic (`firebase/ai`, v12.5.0+) | All inference: on-device redaction, hybrid/cloud answers | [V] SDK and modes |
| App Check | Required for AI Logic; debug token accepted for submissions. Set `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` before `initializeAppCheck`, register the logged token in the console | [V] from docs; behavior inside an extension **[TV]** (provider choice for extension) |
| Remote Config | Policy: thresholds, enabled entity types, strict-mode default, kill switch, model routing choices. Defaults baked in so the extension works offline | Planned |
| Authentication | Anonymous sign-in by default (low friction). Google sign-in popups in MV3 may be awkward **[TV]** | Planned, minimal |
| Firestore | Optional, stretch: distribute public detector packs only. **Never** user text, vault values, ledger or custom terms | Optional |

Console monitoring shows no data for on-device requests [V], so the ledger is the app's own source of truth.

## 9. Storage

| Data | Where | Lifetime |
|---|---|---|
| Vault (placeholder ↔ value) | memory, optionally `chrome.storage.session` **[TV]** access from each context | Browser session |
| Conversation (sanitized + restored view) | memory; optional "keep history" off by default | Until panel closed |
| Settings, custom terms | `chrome.storage.local` (custom terms may themselves be sensitive; stored locally only, never synced) | Persistent |
| Ledger | memory, counts only; optional export of counts as JSON | Session |

## 10. Permissions and security posture
- Minimum permissions: `sidePanel`, `storage`, `contextMenus` (optional), `activeTab`/`scripting` as needed, host permissions only for the three supported sites (phase 2). Exact list decided at scaffolding **[TV]**.
- Strict extension CSP, no `eval`, no remote scripts; Firebase SDK bundled, not loaded from a CDN.
- Content scripts run in the isolated world; no raw text is posted to the page via `window.postMessage`.
- Details and residual risks: `03-PRIVACY-THREAT-MODEL.md`.

## 11. UI outline (Phase 1)
1. **Chat view**: composer, messages (restored text), per-message "shield" chip that opens the ledger.
2. **Review sheet**: masked text with colored highlights by type, click to un-mask, select text to mask, mode banner (full / reduced confidence), "Send sanitized" button.
3. **Ledger drawer**: per message steps with badges `ON-DEVICE` / `CLOUD` / `RULES`, counts by type, "Raw text left device: No".
4. **Status bar**: model state (ready / downloading % / unavailable), online/offline, strict mode toggle.
5. **Onboarding**: 3 steps (what leaves/doesn't leave, enable the model, try sample text).
6. **Options**: entity types, locale packs, custom terms, strict mode, privacy explainer.

## 12. Build and tooling (decision details in `04-DECISIONS.md`)
Vite multi-entry (side panel, options, background, content scripts), TypeScript strict, React 18, Vitest for `src/core` and `src/ai` with a fake AI, Playwright for extension e2e (real Chrome channel needed for Nano **[TV]**).
