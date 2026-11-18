# 02 — System Design

Legend: **[V]** verified (see `08-VERIFY-LIST.md` for the source), **[TV]** to verify by a spike or doc check, **[K]** general knowledge not re-checked, **[D]** our decision. Companion documents: detection details `09`, AI calls `10`, UX `11`, extension mechanics `12`, setup `13`, spikes `14`.

## 1. Overview

```
 User text
    │
    ▼
┌────────────┐   ┌──────────────────────────────────────────────┐
│  Chunker   │──▶│ Layer 1: Deterministic detectors (rules)     │  always runs, whole text
└────────────┘   └──────────────────────────────────────────────┘
                              │ spans
                              ▼
                 ┌─────────────────────────────────────┐
                 │ Layer 2: Gemini Nano detector        │  ONLY_ON_DEVICE, JSON output,
                 │ (Firebase AI Logic)                  │  only when state == ready
                 └─────────────────────────────────────┘
                              │ spans (additive only)
                              ▼
                 ┌─────────────────────┐   ┌───────────┐
                 │ Merge + Masker      │──▶│  Vault    │ placeholder ↔ real value
                 └─────────────────────┘   │ (storage. │ never leaves the device
                              │            │ session)  │
                              ▼            └───────────┘
                 ┌─────────────────────┐
                 │ Safety gate         │ re-scan sanitized text; block if anything high-confidence remains
                 └─────────────────────┘
                              │ SanitizedText (branded)
                              ▼
                 ┌─────────────────────┐
                 │ User review         │ edit masks, add items, see what the AI will see
                 └─────────────────────┘
                              │ confirmed sanitized text
                              ▼
                 ┌─────────────────────┐
                 │ Router (policy)     │ consent? on-device ready? size? task? offline? kill switch?
                 └─────────────────────┘
                     │             │
          PREFER_ON_DEVICE      ONLY_IN_CLOUD (Gemini via Firebase AI Logic, consent required)
                     └─────┬───────┘
                           ▼  answer with placeholders
                 ┌─────────────────────┐
                 │ Restorer (local)    │ placeholders → real values via vault
                 └─────────────────────┘
                           ▼
                 Answer shown + Ledger entry
```

Core property: **the only text that can reach the cloud is the output of the Safety gate, after user review and consent.** Enforced structurally (§6) and tested (doc 06, L-1).

## 2. Extension contexts (Manifest V3) — detail in doc 12

| Context | Role | Verified facts and open points |
|---|---|---|
| Side panel page (React) | Hosts the chat UI **and the AI engine** (Firebase SDK, redaction, routing, vault, ledger) | `sidePanel` is Chrome 114+, `open()` is 116+ and needs a user gesture, including one from a content script [V-44]. `initializeDeviceModel` needs a user interaction [V-22]. Chrome documents the Prompt API for extensions [V-40]; the Firebase SDK on top of it inside a side panel is **[TV-1] spike S-1** |
| Background service worker | Opens the panel, routes guard messages to the engine host, holds no content | The Prompt API is **not available in Web Workers** [V-41], so the model does not run here (service-worker case to confirm, TV-2) |
| Offscreen document (fallback) | Alternative engine host so the guard works with the panel closed | Only one at a time, cannot be focused, no AI reason code [V-45]; user-activation question **[TV-2]**; planned only if spike S-2 shows value |
| Content scripts (phase 2) | Per-site adapters: prompt box, submit interception, preview overlay | Matches only the 3 supported hosts. Selectors **[TV-11]**, expect breakage |
| Options page | Settings, custom terms, packs, consent, privacy explainer, tester config | |

Message flow for the guard: content script ⇄ background ⇄ engine host (side panel, or offscreen if chosen). Messages carry raw text between **local extension contexts only**; they never cross to a page's JS and are never sent over the network. If the engine is not open the guard asks the user to open the panel with a click, never silently skipping the scan [doc 12 §4, ADR-020].

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
  start: number; end: number;          // offsets in the ORIGINAL text
  source: 'rule' | 'nano' | 'user';
  confidence: 'high' | 'medium' | 'low';
  reason: string;                      // e.g. 'luhn-ok', 'context:account', 'custom-term'
}

interface VaultEntry { placeholder: string; type: EntityType; surfaceForms: string[] }   // storage.session only

type AvailabilityState = 'unknown' | 'unavailable' | 'downloadable' | 'downloading' | 'ready' | 'degraded';

interface MaskResult {
  sanitized: string;                  // not yet branded: the gate brands it
  spans: Span[];
  vaultDelta: VaultEntry[];
  mode: 'full' | 'rules-only';
  degradedChunks: number[];           // indexes handled by rules only
}

type GateResult =
  | { status: 'passed'; text: SanitizedText; remainingMedium: number }
  | { status: 'blocked'; leftovers: { type: EntityType; start: number; end: number }[] };   // positions, not values

interface RoutingDecision { route: 'ON_DEVICE' | 'IN_CLOUD'; reason: string; modelName?: string }

interface LedgerEntry {
  id: string; ts: number;
  counts: Partial<Record<EntityType, number>>;        // counts only, never values
  steps: {
    name: 'detect-rules' | 'detect-nano' | 'gate' | 'answer' | 'restore';
    route: 'ON_DEVICE' | 'IN_CLOUD' | 'RULES';
    inferenceSource?: 'ON_DEVICE' | 'IN_CLOUD';       // from the SDK response [V-23]
    model?: string; ms?: number; ok: boolean; note?: string;
  }[];
  rawLeftDevice: false;                               // invariant, asserted by the gate (I-3)
  mode: 'full' | 'rules-only';
  routing?: RoutingDecision;
  restore?: { restored: number; unknown: number; mangled: number };
  consentVersion?: number;
}

interface ConsentState { cloudAllowed: boolean; over18: boolean; regionOk: boolean; version: number; at: number }
```
Placeholder labels and the full entity table (labels like `[CARD_1]`, `[ACCT_2]`, `[ADDR_1]`) are defined in doc 09 §2. Locale packs: `GLOBAL`, `US`, `IN` (country of residence is India; Q-3 mostly answered).

## 4. Detection (summary; spec in doc 09)

### Layer 1 — deterministic (always on, no AI)
- Normalization (NFKC, digit folding, zero-width removal) with an offset map to the original text.
- Regex candidates plus validators: Luhn, IBAN mod-97, Verhoeff (Aadhaar), ABA routing checksum, format rules (SSN, PAN, IFSC), keyword context for ambiguous digit runs.
- Runs on the whole text, independent of chunking and the model. Output spans with confidence; checksum-valid cards/IBANs are `high`.

### Layer 2 — Gemini Nano (on-device) via Firebase AI Logic
- `getGenerativeModel(ai, { mode: InferenceMode.ONLY_ON_DEVICE, onDeviceParams: { promptOptions: { responseConstraint } } })` [V-21, V-26]. Single-turn text only, max about 9,216 tokens [V-27]; the response constraint itself consumes context [V-43]. Chunk size initial guess 1,500 chars with 150 overlap **[TV-4, TV-22]**.
- Task: names, organizations, addresses, DOBs, other personal IDs. The prompt asks for **exact substrings**; the engine maps them to offsets itself, discarding anything not found verbatim.
- Model output is untrusted input: strict schema validation; failure means "chunk degraded", never "clean".
- Layer 2 only **adds** spans.

### Merge, mask and gate
Overlap resolution and right-to-left masking (doc 09 §8); deterministic safety gate that re-scans the masked text, checks the vault values do not appear, and checks chunk-boundary windows (doc 09 §9.3).

### Degraded modes
| Condition | Behavior |
|---|---|
| Nano not downloaded | Offer the enable button (user interaction needed [V-22]); meanwhile rules-only |
| Nano downloading | Rules-only until `ready`; progress shown. **Do not issue a redactor call**: with `ONLY_ON_DEVICE` it would wait for the download [V-22] |
| Nano unsupported / throws | `mode: 'rules-only'`, banner "reduced confidence", review mandatory |
| Chunk too large / timeout / invalid JSON | Chunk marked degraded (rules-only for that part) with a visible marker |
| Gate finds a leftover high-confidence item | Block send, highlight the item, ask the user |
| Input over `max_input_chars` | Nano on the first chunks only; remainder rules-only with a warning |

## 5. Answer routing (detail in doc 10 §9)

- Inputs: **sanitized text only**; policy values from Remote Config with in-code defaults; consent state; availability state; online status; user route preference.
- Instances (ADR-014): `responderHybrid` = `PREFER_ON_DEVICE`; `responderCloud` = `ONLY_IN_CLOUD`. The policy module picks; the ledger stores `{ route, reason }` and the SDK's `inferenceSource` [V-23].
- Cloud is only reachable with **consent** (ADR-013) and when the kill switch is off.
- On-device is **single-turn** [V-27], so both routes get one flattened prompt built from the sanitized history (ADR-017); token budget by `chars / 4` because count-tokens is unreliable in hybrid [V-27].
- Cloud model name comes from Remote Config with the default `gemini-3.5-flash-lite` [V-24]; set explicitly (ADR-019); verify at T-0.11 [TV-6].
- `generateContentStream` is available [V-27 text]; extension behavior **[TV-9]**.

## 6. Structural guarantees (how hard rule 1 is enforced)

1. The AI wrapper exposes typed functions only: `redactOnDevice(raw: RawText)` (always the `redactor` instance, `ONLY_ON_DEVICE`, no cloud params) and `answer(sanitized: SanitizedText)`.
2. `SanitizedText` is a branded type only the safety gate can produce. `answer()` does not accept `string`.
3. Lint rule / unit test fails the build if `getGenerativeModel` is called outside `src/ai/`.
4. Runtime assertion: every `redactor` response must report `inferenceSource === 'ON_DEVICE'`; otherwise discard and error (I-5).
5. Leak test L-1 runs the whole pipeline with a network spy and asserts that no outbound request body contains any seeded raw value; L-3 verifies the model-unavailable path makes no request.
6. Cloud calls are impossible without a consent record (I-6), enforced in the policy module and tested.

## 7. Restore (detail in doc 09 §10)
- Replace `[LABEL_n]` tokens in the answer using the vault: exact match first, then tolerant matching of known variants (case, inner spaces, markdown escapes, other bracket types). Never fuzzy-guess to a "closest" token **[TV-15]** measured in eval.
- Unknown placeholders are left as is and flagged. Pre-existing placeholder-like text in the input is treated as literal (collision avoidance).

## 8. Firebase usage

| Product | Use | Status |
|---|---|---|
| AI Logic (`firebase/ai`, v12.5.0+; default cloud model changes at v13.0.0) | All inference: on-device redaction, hybrid/cloud answers | [V-20, V-21, V-24]; SDK version to pin at scaffold **[TV-21]** |
| App Check | Required for AI Logic and **auto-enforced since Nov 2, 2026**; debug provider for development, debug tokens accepted in submissions | [V-12, V-29]; extension behavior and any production provider **[TV-3]**; reCAPTCHA-style providers need remote scripts the MV3 CSP blocks [K] |
| Remote Config | Policy: model name, thresholds, budgets, kill switch, strict-mode default, consent version; defaults baked in | Planned; keys in doc 13 §6; behavior in extension **[TV-5]** |
| Authentication | Anonymous sign-in by default (low friction). Google sign-in popups in MV3 may be awkward **[TV]** | Planned, minimal |
| Firestore | Optional stretch: public detector packs only (data-only). Never user text, vault, ledger or custom terms | Optional (ADR-010) |

Console monitoring shows no data for on-device requests [V-28], so the app's ledger is the source of truth. Per-user default limit 100 requests per minute [V-30].

## 9. Storage (detail in doc 12 §5)

| Data | Where | Lifetime |
|---|---|---|
| Vault (placeholder ↔ value) | `chrome.storage.session` (in memory; cleared on disable/reload/update/restart; hidden from content scripts by default) [V-46] | Browser session |
| Conversation (sanitized only) | `chrome.storage.session` | Browser session |
| Ledger | `chrome.storage.session`, counts only | Browser session |
| Settings, consent, onboarding, rc cache | `chrome.storage.local` | Persistent |
| Custom terms | `chrome.storage.local` (may be sensitive; never synced, never Firestore) | Persistent |
| Tester Firebase config / debug token | `chrome.storage.local`, optional, clearable | Persistent until cleared |
`chrome.storage.sync` is never used (ADR-018).

## 10. Permissions and security posture (detail in doc 12 §2)
- Permissions: `sidePanel`, `storage`. Content script `matches` for three sites only. No `tabs`, `activeTab`, `scripting`, `contextMenus` in v1 unless justified in doc 12.
- Strict CSP `script-src 'self'`; no `eval`; no remote scripts; Firebase SDK bundled, not loaded from a CDN.
- Content scripts run in the isolated world; no raw text is posted to the page via `window.postMessage`.
- The guard cannot hide what a user already typed into a page that has its own scripts (T-18); it reduces what is **submitted**.

## 11. State machines

### 11.1 Engine availability (doc 10 §2)
`unknown → (unavailable | downloadable | downloading | ready)`; `downloadable → downloading` on a user click (`initializeDeviceModel`); `downloading → ready`; `ready → degraded` on model errors or removal (disk under 10 GB [V-42]); `degraded → ready | unavailable` after recheck.

### 11.2 Pipeline run
```
idle → analyzing(rules) → analyzing(nano, chunk i/n) → merging → gating
     → (blocked → review) | (passed → review) → confirmed → routing → answering → restoring → done
any state → cancelled | error  (nothing sent unless 'answering' started after confirmation)
```
Cancel is allowed up to `answering`; after the request is sent, cancel aborts waiting for the answer but cannot recall the request.

### 11.3 Send sequence (happy path, hybrid)
1. User presses Send → pipeline `analyzing`.
2. Rules run on the whole text; Nano runs per chunk if `ready`.
3. Merge, mask, gate → `SanitizedText` → review sheet.
4. User confirms → router decides (`consent`, size, availability, online, task) → `answer(sanitized)` with the chosen responder.
5. Response arrives with `inferenceSource`; restorer substitutes values locally; ledger entry written; UI shows restored answer with route badge.

## 12. Observability and logging
No telemetry. Debug logging is off in production builds; when on in development it logs **only** counts, timings, states and error classes — never text, values, spans' text or vault contents (lint/grep check, T-4.7). The ledger is the user-facing audit trail.

## 13. Performance budgets [D, to measure]
Rules under 100 ms for typical input (doc 09 §11); Nano per chunk and end to end measured in spike S-5 and reported honestly; UI interactions under 100 ms; first side-panel paint under 500 ms.

## 14. Build and tooling (decision details in `04-DECISIONS.md`)
Vite multi-entry (side panel, options, background, content script as IIFE), TypeScript strict, React 18, Vitest for `src/core` and `src/ai` with a fake AI port, Playwright for extension e2e on Chromium with a fake AI; real Nano is checked manually in Google Chrome **[TV-12]**.

## 15. Requirements trace
| Requirement (doc 01) | Where designed |
|---|---|
| F-1, F-2 | doc 09 |
| F-3, F-6 | doc 10, §5, §6 |
| F-4, F-5, F-7 | doc 09 §9, §10 |
| F-8 | doc 11 §4.4 |
| F-9 | §3 `LedgerEntry`, doc 11 §4.5 |
| F-10 | doc 09 §9.3 |
| F-11 | doc 13 §6, §8 |
| F-12 | doc 10 §2, doc 11 §4.1 |
| F-13 | doc 09 §4 |
| F-14, F-15 | doc 12 §8 |
| F-16 (consent gate), F-17 (on-device-only mode), F-18 (tester config) | ADR-013, ADR-016, doc 11 §4.7, §4.10 |
