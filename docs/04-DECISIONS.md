# 04 — Architecture Decision Records

Format: Context, Decision, Alternatives, Consequences. Status: Accepted unless noted. Items marked *user-decided* came from the product discussion.

## ADR-001 — Product shape: side panel first, guard second *(user-decided)*
- Context: the idea is "a trust layer in front of AI". The side panel is where the Firebase hybrid pipeline (on-device redaction plus cloud answer) is fully visible; the guard is the "works in front of any AI you already use" hook.
- Decision: Phase 1 side-panel private chat, Phase 2 guard on chatgpt.com, claude.ai, gemini.google.com.
- Alternatives: guard only (weak Firebase cloud usage), side panel only (loses the distinctive angle).
- Consequences: guard work is cut first if time runs out; Phase 1 must be demo-complete on its own.

## ADR-002 — No-model fallback: rules-only, never raw to cloud *(user-decided)*
- Decision: when Gemini Nano is unavailable, use the deterministic detector only, label "reduced confidence", require review.
- Alternatives: block entirely (judges on other machines see nothing), allow cloud with warning (breaks the promise).
- Consequences: the extension is demonstrable on any machine; privacy claim stays intact; detection quality is lower in this mode and the UI says so.

## ADR-003 — Redaction uses `ONLY_ON_DEVICE`
- Decision: all calls that see raw text use `InferenceMode.ONLY_ON_DEVICE`, which throws if the model is unavailable instead of falling back [V per Firebase docs].
- Consequences: privacy is enforced by the SDK mode, not by our own if-statements; plus the type-level guard in the design doc.

## ADR-004 — Two-layer detection (rules + Nano)
- Context: small on-device models miss things and can be manipulated; regex cannot find names.
- Decision: rules always run and cannot be overridden by the model; the model only adds spans.
- Consequences: more code, but robust against model failure and injection.

## ADR-005 — Engine hosted in the side panel (offscreen document as fallback)
- Context: `initializeDeviceModel` needs a user interaction [V]; service workers may not expose the Prompt API **[TV]**.
- Decision: host the AI engine in the side panel page; decide on an offscreen document only if spike S-2 shows the guard needs it.
- Consequences: guard may require the panel to be open unless the offscreen route works. Documented limitation if so.

## ADR-006 — Placeholder format `[TYPE_n]`
- Decision: bracketed typed tokens, stable per value within a conversation.
- Alternatives: opaque UUIDs (models may mangle), unicode brackets (tokenization risk).
- Consequences: need to measure placeholder survival rate and tolerant restore **[TV]**; may change format if survival is poor.

## ADR-007 — Amounts are not masked by default
- Context: finance questions need numbers ("can I afford this loan?"). Masking amounts destroys utility.
- Decision: `AMOUNT` is off by default; "strict mode" turns it on; the UI explains the trade-off.

## ADR-008 — Stack: TypeScript, Vite (no extension plugin), React, Vitest, Playwright
- Context: 12 days, need speed and low tooling risk.
- Decision: Vite multi-entry build with a hand-written `manifest.json` (no CRXJS or similar plugin to avoid maintenance/compat risk), React 18 for side panel/options, plain CSS, Vitest for logic, Playwright for e2e.
- Alternatives: plugin-based Vite extension frameworks (faster HMR but a dependency risk), vanilla JS (slower UI work).
- Status: revisit at scaffolding if the build gets painful.

## ADR-009 — Auth: anonymous by default
- Decision: anonymous Firebase Auth to satisfy AI Logic/App Check needs with zero friction; Google sign-in only if it works easily in MV3 **[TV]**.

## ADR-010 — Firestore optional, never user data
- Decision: if used at all, only for public detector packs. User text, vault, ledger and custom terms never leave the device except sanitized prompts to the model.

## ADR-011 — Companion app deferred
- Decision: no Android/iOS work until Phases 1 and 2 plus submission materials are done. Shared pure logic in `src/core/` keeps a later port possible.
- Note: the development iPhone does not support Apple Intelligence, so iOS on-device testing is not available on it; Android on-device needs a supported physical device **[TV: which devices]**.

## ADR-012 — License: Apache-2.0
- Decision: Apache-2.0 (the hackathon prefers Apache; any OSI license is accepted). LICENSE must be detectable in the repo's About section.
