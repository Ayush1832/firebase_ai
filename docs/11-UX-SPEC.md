# 11 — UX and Interface Specification

The judging criterion "Design" asks for a **complete, coherent product experience, not a proof of concept** [V-7]. This document specifies every screen, state and piece of copy so nothing is invented at the last minute. All data shown in mockups is synthetic.

## 1. Design principles
1. **The privacy boundary is the feature.** Show what stayed, what left, and which model did what, in plain words, at the moment it matters.
2. **Honest, never boastful.** No "100% private" or "guaranteed" anywhere (threat model §1). Say "found 5 items" and "check for anything missed".
3. **Safe by default, in control always.** Defaults protect; every automatic action can be reviewed and changed before anything leaves the device.
4. **Calm and legible.** Narrow side panel (about 360 to 480 px wide), generous spacing, one primary action per screen.
5. **Every state designed.** Empty, loading, downloading, offline, degraded, blocked, error, success.
6. **Accessible.** Keyboard operable, visible focus, color never the only signal, WCAG AA contrast target.

## 2. Visual system [D]
- **Type:** system font stack (no remote fonts); scale 12 / 14 / 16 / 20 / 24; line height 1.5; code and placeholders in a monospace stack.
- **Spacing:** 4 px base; panel padding 16 px.
- **Radius:** 8 px cards, 999 px chips.
- **Color tokens (light / dark):** defined as CSS variables in `src/ui/tokens.css`; dark mode follows `prefers-color-scheme`.

| Token | Meaning | Light | Dark |
|---|---|---|---|
| `--bg` | background | #FFFFFF | #0F1419 |
| `--surface` | cards | #F6F8FA | #18202A |
| `--text` | body | #1A2330 | #E6EDF3 |
| `--muted` | secondary | #5B6776 | #9AA7B5 |
| `--accent` | primary action | #0B57D0 | #8AB4F8 |
| `--on-device` | ON-DEVICE badge | #0F7B53 | #5CC99B |
| `--cloud` | CLOUD badge | #8A4B00 | #F2B866 |
| `--rules` | RULES badge | #4D5A6B | #AAB6C4 |
| `--danger` | blocked / error | #B3261E | #F2B8B5 |
Entity highlight colors are derived from one hue per type family (identifiers, people/places, secrets), each paired with a text label and an icon so color is never the only cue. Contrast of every text/background pair must be checked in T-4.5; the hex values above are starting points, not verified.

## 3. Information architecture
Side panel (primary) with four areas, plus a separate options page:
1. **Chat** (default)
2. **Review sheet** (modal sheet over chat, appears before every send)
3. **Ledger drawer** (opens from a shield chip on any message)
4. **Status bar** (always visible, top)
Options page: General, Detection, Cloud and privacy, Custom terms, Advanced (testers), About.

## 4. Screens

### 4.1 Status bar (always visible)
```
┌──────────────────────────────────────────────┐
│ 🛡 Privacy Router        ● On-device ready    │
│ Strict: off    Route: Auto ▾    ⚙            │
└──────────────────────────────────────────────┘
```
States for the model chip:
| State | Chip | Behavior |
|---|---|---|
| ready | `● On-device ready` (green) | |
| downloadable | `○ Enable on-device AI` (button) | click starts `initializeDeviceModel` (needs a real click [V-22]) |
| downloading | `◔ Downloading model 42%` | progress bar; the rest of the app works in rules-only mode |
| unavailable | `⚠ On-device AI unavailable: rules-only` | link "Why?" opens §4.9 |
| degraded | `⚠ On-device AI had a problem` | retry button |
Other chips: `Online` / `Offline`; route (`Auto`, `On-device only`, `Cloud allowed`).

### 4.2 Chat view
```
┌──────────────────────────────────────────────┐
│ (status bar)                                 │
├──────────────────────────────────────────────┤
│  You                                         │
│  Dear Priya Sharma, my card 4242 … was       │
│  charged twice…                              │
│                                  🛡 5 masked │
│  Assistant                    ON-DEVICE      │
│  Here's a draft for [Priya Sharma]… ← restored │
│                                  🛡 Ledger   │
├──────────────────────────────────────────────┤
│ ┌──────────────────────────────────────┐ ▶ │
│ │ Ask anything. Private details are    │   │
│ │ masked before they leave your device │   │
│ └──────────────────────────────────────┘   │
│ [Try a sample] [Paste]                       │
└──────────────────────────────────────────────┘
```
- Your messages show the **original** text (restored view) with a small shield chip showing the count of masked items. Assistant messages show restored values with restored words subtly underlined (hover/focus: "Restored from [PERSON_1] on your device").
- Each assistant message shows a route badge (ON-DEVICE, CLOUD) taken from `inferenceSource` [V-23].
- Composer: multi-line, Enter sends, Shift+Enter new line; **Send** begins the pipeline (it does not directly send).
- Empty state: one-sentence explanation + "Try a sample" button (inserts a synthetic dispute email) + "How it works" link.

### 4.3 Analyzing state (after pressing Send)
```
Analyzing on your device…
 ✓ Rules checked (12 ms)
 ◔ On-device AI scanning for names and addresses (chunk 1 of 2)
   Nothing has left your device.            [Cancel]
```
- Step list reflects real progress events from the pipeline orchestrator.
- "Nothing has left your device." is shown **only** while that is true (before any cloud call), driven by state, not static text.

### 4.4 Review sheet (the key screen)
```
┌──────────────────────────────────────────────┐
│ Review before sending            Full scan ✓ │
│ 5 items will be masked                       │
├──────────────────────────────────────────────┤
│ Dear [Priya Sharma · PERSON]                 │
│ my card [4242 4242 4242 4242 · CARD] was     │
│ charged $120.50 on 3 Nov. Reach me at        │
│ [priya@example.com · EMAIL]  [+91 98… · PHONE]│
│ Landlord: Dev Kapoor ← not masked  [Mask]    │
├──────────────────────────────────────────────┤
│ ▸ Masked items (5)   ▸ Warnings (1)          │
├──────────────────────────────────────────────┤
│ [Back to edit]            [Send sanitized ▶] │
└──────────────────────────────────────────────┘
```
Behaviors:
- Highlights: each masked item is a chip showing the original value inline and its type label; click toggles un-mask / mask (high-confidence items ask for confirmation: "This looks like a valid card number. Show it to the AI anyway?").
- **Mask this too:** select any text → floating "Mask" button (also `Ctrl/Cmd+M`) → choose type (default `CUSTOM`).
- **Preview mode toggle:** "Show what the AI will see" switches the text to the sanitized version with placeholders.
- **Banner by mode:**
  - Full scan: green check "Rules and on-device AI both ran".
  - Reduced confidence (rules-only): amber banner "On-device AI isn't available, so only pattern checks ran. Names and addresses may be missed. Please read through before sending." **Send is disabled until the user ticks "I've reviewed this"** (ADR-002).
  - Degraded chunk: "Part of your text (paragraph 3) was checked with patterns only."
- **Send button states:** enabled when the gate passed; disabled with reason "A valid card number is still unmasked" when the gate blocked (chip highlighted and scrolled into view).
- **Route and consent line above the button:**
  - On-device only: "This will be answered on your device."
  - Cloud allowed: "The masked text will be sent to Google's Gemini through Firebase."
  - If cloud consent is not given: the button label becomes "Answer on my device" and a link "Allow cloud answers…" opens the consent dialog (§4.7).

### 4.5 Ledger drawer
```
┌──────────────────────────────────────────────┐
│ Ledger · message 3                           │
├──────────────────────────────────────────────┤
│ 1  Find sensitive items   ON-DEVICE  (AI)  ✓ │
│ 2  Pattern checks         RULES            ✓ │
│ 3  Safety check           RULES            ✓ │
│ 4  Answer                 CLOUD   gemini-… ✓ │
│ 5  Restore your values    ON-DEVICE        ✓ │
├──────────────────────────────────────────────┤
│ Masked: Person 1 · Card 1 · Email 1 · Phone 1│
│ Raw text left your device: No               │
│ What the cloud received: [View sanitized ▾]  │
└──────────────────────────────────────────────┘
```
- "Raw text left your device: No" appears **only if** the gate passed and no raw-path was used (invariant I-3). If the user chose **Send original** in the guard, it shows "Yes (you chose to send the original)".
- "View sanitized" shows exactly the string that was sent (placeholders only).
- Counts only; never values.
- Export: "Download ledger (counts only, JSON)" [D, optional].

### 4.6 Onboarding (first run, 3 steps)
1. **What happens to your text.** Three-line diagram: your device finds private details → only masked text goes to the cloud → your values are put back on your device. Honest line: "No detector is perfect. You always get a review step."
2. **Turn on on-device AI.** Button "Download on-device model" (real click; progress; **disk requirement shown**: Chrome needs about 22 GB free to download [V-42]); "Skip for now" is allowed and explains rules-only mode.
3. **Try it.** "Use a sample message" fills a synthetic example and walks through review. Skippable.
Goal: a new profile reaches a first successful masked chat in under 2 minutes (T-2.10).

### 4.7 Cloud consent dialog (ADR-013; first time cloud would be used)
Title: "Allow cloud answers?"
Body (draft, final wording after reading terms again at T-5.1):
- "Privacy Router first masks private details on your device. If you allow it, the **masked** text is sent to Google's Gemini through Firebase AI Logic to write the answer."
- "On the free tier, Google may use content sent to its API to improve its products, and human reviewers may read it. Masking reduces what they could see, but it isn't perfect. Don't send things you wouldn't want anyone to read."
- Checkboxes (all required): "I am 18 or older." / "I am not using this in the European Economic Area, Switzerland or the United Kingdom." (the free-tier terms restrict those regions [V-38]) / "I understand the points above."
- Buttons: "Allow cloud answers", "Use on-device only".
Stored in `consent` with a version number; re-asked if the text changes.

### 4.8 Guard overlay (Phase 3, on third-party sites)
```
┌──────────────────────────────┐
│ 🛡 Privacy Router            │
│ 5 items masked in your prompt│
│ Person 1 · Card 1 · Email 1… │
│ [Review] [Send masked ▶]     │
│ Send original (not advised)  │
└──────────────────────────────┘
```
- Small card anchored near the prompt box, keyboard focusable, dismiss with Esc (which cancels the send, never sends).
- States: scanning, masked, nothing found ("No sensitive items found. Check for names yourself." with Send), blocked, engine not open ("Open Privacy Router to scan this prompt" [button]), inactive ("Guard inactive on this page").
- No third-party branding is copied into the overlay.

### 4.9 "Why is on-device AI unavailable?" help
Lists checks with results where detectable: Chrome version ≥ 139; the required flag(s) (names per TV-7); free disk (Chrome needs about 22 GB free and removes the model under 10 GB [V-42]); hardware (GPU > 4 GB VRAM or CPU with 16 GB RAM and 4 cores [V-42]); unmetered network for download. Show `chrome://on-device-internals` as copyable text (whether an extension page may open `chrome://` URLs is not verified [K, TV]).

### 4.10 Options page
- **General:** strict mode (also masks amounts, explained), default route, theme.
- **Detection:** entity types on/off; locale packs (Global always on, US, IN); "Show low-confidence suggestions".
- **Cloud and privacy:** consent status (revoke), the privacy explainer (what leaves, what does not, the free-tier note), "Clear session data now".
- **Custom terms:** add/remove always-mask terms (stored locally only; notice that they never sync).
- **Advanced (testers):** Firebase config override, App Check debug token (masked field, clear button), model name override. Clearly labeled "for testing; not needed for normal use" [doc 12 §7].
- **About:** version, license (Apache-2.0), repo link, limitations list.

## 5. Copy deck (do and don't)
| Say | Don't say |
|---|---|
| "Masked 5 items on your device" | "Fully secured", "100% private", "guaranteed" |
| "Raw text left your device: No" (only when true) | "Nothing can ever leak" |
| "On-device AI unavailable, so only pattern checks ran" | "AI protection on" when rules-only |
| "Check for names or addresses we may have missed" | silence about limitations |
| "Sent to Google's Gemini (masked)" | "Sent securely" |

## 6. Accessibility checklist (T-4.5)
- All controls reachable by keyboard; logical tab order; visible focus ring; `Esc` closes sheets/overlays without sending.
- Review sheet chips are buttons with accessible names ("Unmask Person 1: Priya Sharma").
- Status changes announced via `aria-live="polite"` (download progress throttled).
- Text contrast AA; focus indicators ≥ 3:1; not color-only.
- Respect `prefers-reduced-motion`; no animations required to understand state.
- Touch/click targets ≥ 24 px.

## 7. Empty, loading, error states (every one needs a design before T-2.12)
| Situation | Message (draft) | Action |
|---|---|---|
| No input | (Send disabled) | |
| Oversized input | "That's long. The first part gets the full scan; the rest uses pattern checks only." | Continue / Trim |
| Model download failed | "Couldn't download the on-device model. Check disk space and connection." | Retry, Why? |
| Cloud unreachable | "Couldn't reach the cloud. Your masked text wasn't sent." | Retry / Answer on-device |
| App Check failure | "This build isn't authorized to call the AI service yet." | Setup guide link (doc 13) |
| Rate limit | "Too many requests. Try again in a minute." | Retry |
| Gate blocked | "A valid-looking card number is still unmasked." | Highlight item |
| Session cleared | "Session cleared for your privacy." | New chat |

## 8. Demo-driven requirements
The 3-minute video (doc 07 §4) needs: a sample message button, visible route badges, a readable ledger at video resolution, an offline demo (airplane mode), and no clutter. UI font sizes must remain legible at 1080p screen capture (minimum 14 px body in the panel; zoom the panel to 125% for recording if needed).
