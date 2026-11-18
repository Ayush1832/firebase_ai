# 09 — Detection, Masking and Restore Specification

This is the build-level spec for `src/core/` (pure TypeScript, no `chrome.*`, no Firebase imports). It refines `02-SYSTEM-DESIGN.md` §3 to §7. Evidence labels as in `08-VERIFY-LIST.md`: [V] verified, [TV] to verify, [K] general knowledge, [D] our design decision.

Everything in this file is **synthetic**. Test numbers are published test values or are generated; see §12.

## 1. Principles
1. **Rules never lose to the model.** The model can only add spans. A rule span is never removed or downgraded by Layer 2 [D, ADR-004].
2. **Validators over patterns.** A digit run is a *candidate*; a checksum or context rule turns it into a detection. Candidates that fail a checksum are not masked by the rule (they may still be masked if context says "card number" and the user confirms in review).
3. **Fail loud, fail safe.** Any detector error becomes "this chunk is rules-only", never "this chunk is clean".
4. **Offsets are ours.** Model output is substrings; we find offsets ourselves. We never trust offsets from a model [D].
5. **Normalize for matching, mask in the original.** Matching runs on a normalized view with an offset map back to the original text (§3).
6. **Explainable.** Every span carries `type`, `source`, `confidence` and a `reason` string (e.g. `luhn-ok`, `context:account`), shown in the review sheet.

## 2. Types, labels and defaults

`EntityType` (from doc 02 §3) with the placeholder label used in `[LABEL_n]`:

| EntityType | Label | Source | On by default | Notes |
|---|---|---|---|---|
| PERSON | PERSON | Nano, user, custom | yes | rules cannot find names; context rules only for salutations (§6.4) |
| ORG | ORG | Nano, user | yes | employer, bank name when tied to a person's account |
| EMAIL | EMAIL | rule | yes | |
| PHONE | PHONE | rule | yes | |
| ADDRESS | ADDR | Nano, user | yes | |
| DOB | DOB | rule (context), Nano | yes | |
| CARD_NUMBER | CARD | rule | yes | Luhn |
| ACCOUNT_NUMBER | ACCT | rule (context) | yes | generic account numbers need a context keyword |
| IBAN | IBAN | rule | yes | mod-97 |
| ROUTING_OR_IFSC | ROUTING | rule | yes | US routing (checksum), IN IFSC (format) |
| TAX_ID | TAXID | rule | yes | US SSN/ITIN shape, IN PAN |
| GOV_ID | GOVID | rule | yes | IN Aadhaar (Verhoeff) |
| UPI_ID | UPI | rule | yes | IN pack |
| TXN_ID | TXN | rule (context) | yes | references next to "transaction", "UTR", "reference" |
| CREDENTIAL | SECRET | rule | yes | passwords after keywords, private-key blocks, bearer tokens |
| API_KEY | KEY | rule | yes | shapes in §6.3 |
| AMOUNT | AMT | rule | **no** (strict mode) | ADR-007 |
| CUSTOM | TERM | user terms | yes | exact, case-insensitive |

Placeholder grammar [D]: `\[[A-Z]{2,8}_\d{1,4}\]` (verified to match `[PERSON_1]`, `[CARD_12]` and reject `[x_1]`, `[PERSON_]`, `[A_1]`).

## 3. Normalization with an offset map

Matching input `N` is derived from the original `O`:
1. Unicode **NFKC** (folds full-width digits and compatibility characters).
2. Fold non-ASCII decimal digits (Arabic-Indic, Devanagari, etc.) to ASCII 0-9 [D] (closes the "unicode lookalike digits" gap in the test plan).
3. Remove zero-width characters (U+200B, U+200C, U+200D, U+2060, U+FEFF) and soft hyphen U+00AD.
4. Do **not** collapse whitespace or change case (patterns handle them; keeps offsets simple).

Implementation: build `N` as an array of code units plus `map[i] = index in O`. Any span found in `N` as `[a, b)` becomes `[map[a], map[b-1]+1)` in `O`. Round-trip tests in T-1.5: for 100% of random strings, `mask(O, spans)` removes exactly the covered original characters.

[TV] NFKC may change length (e.g. ligatures); the offset map handles it, the tests must include such strings.

## 4. Chunking

- Goal: send Nano chunks that fit the on-device budget (9,216 tokens total per request [V-27], and the response schema also costs context [V-43]). Initial chunk size is **1,500 characters with 150 characters of overlap** [TV-4/TV-22, tune in spike S-5].
- Split on paragraph, then sentence, then whitespace boundaries (never inside a token that looks like a number or email).
- Each chunk keeps `(startInOriginal, text)`. Spans found in a chunk are shifted back to original offsets; spans found in the overlap are de-duplicated by equal `(start,end,type)`.
- Rules (Layer 1) run on the **whole** text, not per chunk, so rule detection is independent of chunking.
- Nano runs per chunk, sequentially (single on-device session at a time [D]; concurrency is [TV]).
- If a chunk fails (throw, timeout, invalid JSON, `QuotaExceededError`), mark it `degraded` in the result and continue; the UI shows which part was rules-only.
- Hard limit [D]: if total input exceeds `MAX_INPUT_CHARS` (initial 30,000), Nano runs on the first `NANO_MAX_CHUNKS` chunks (initial 12); the remainder is rules-only with a visible warning (F-13).

## 5. Layer 1 pipeline (rules)

```
normalize -> candidates (regex) -> validate (checksum / context) -> confidence -> spans
```

Each detector is a data object so locale packs can add more without touching the engine:

```ts
interface Detector {
  id: string;                        // 'card.luhn'
  type: EntityType;
  pack: 'GLOBAL' | 'US' | 'IN' | string;
  pattern: RegExp;                   // candidate finder, must be linear-time (no nested quantifiers)
  captureGroup?: number;             // span = this group (used by context patterns)
  validate?: (candidate: string, ctx: DetectorContext) => Verdict;   // may return reject / low / medium / high
  contextKeywords?: { words: string[]; window: number; boost: 'medium->high' | 'low->medium' };
  reason: string;
}
```

All regexes must be reviewed for catastrophic backtracking; the unit tests run each detector against a 1 MB adversarial string and fail above a time budget (§11).

### 5.1 Confidence model
- `high`: structurally and checksum valid, or a credential/key shape that is unambiguous.
- `medium`: valid shape without a checksum, or checksum-less digit run with a strong context keyword.
- `low`: context-only guesses (e.g. a bare 10-digit run after "phone").
- Gate policy (see §9): leftover `high` blocks the send; leftover `medium`/`low` are warnings in the review sheet.

## 6. Detector catalogue

Regexes below were **run against the vectors in §12 in Node on Nov 18** unless marked [TV]. They are the starting point; the final versions live in `src/core/packs/*.ts` and must keep passing the vectors.

### 6.1 GLOBAL pack

| Id | Type | Candidate pattern (JS) | Validator and confidence | Reason string |
|---|---|---|---|---|
| email | EMAIL | `\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}\b` | none; high | `email-shape` |
| card | CARD_NUMBER | `(?<![\d])(?:\d[ -]?){12,18}\d(?![\d])` | strip spaces/dashes; length 13 to 19; **Luhn**; high if Luhn passes and issuer prefix plausible (3,4,5,6 first digit), otherwise reject | `luhn-ok` |
| iban | IBAN | `\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,3})?\b` | remove spaces; **mod-97 = 1** (rearrange, letters A=10..Z=35); high; reject otherwise. Per-country length table is an optional extra check [K] | `mod97-ok` |
| phone-e164 | PHONE | `(?<![\w+])\+\d{1,3}[ .-]?(?:\(?\d{1,4}\)?[ .-]?){2,5}\d{2,4}(?!\d)` | digits 8 to 15 total; medium (high with keyword `phone\|mobile\|call\|tel`) | `phone-e164` |
| account-ctx | ACCOUNT_NUMBER | `(?:account\|acct\|a\/c\|acc\.?\s?(?:no\|number)\|iban\|routing\|savings\|checking)[^\n\d]{0,30}(\d(?:[ -]?\d){7,16})(?!\d)` (case-insensitive; **capture group 1 is the span**; `\|` in this table means a regex alternation bar) | 8 to 17 digits after a keyword; medium. High if the number is also in a table row or after "number:" [TV] | `context:account` |
| txn-ctx | TXN_ID | keyword (`txn\|transaction\|utr\|ref(?:erence)?\|order`) then an alphanumeric token of 8 to 24 chars | low; masked only when `strict` or user turns it on (order numbers are usually not sensitive) [D] | `context:txn` |
| dob-ctx | DOB | `(?:dob\|d\.o\.b\.?\|date of birth\|born(?: on)?)[^\n\d]{0,12}(<date>)` where `<date>` is `\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}`, `\d{4}-\d{2}-\d{2}` or `\d{1,2} [A-Z][a-z]{2,8},? \d{4}` | medium; **dates without a birth keyword are not masked** ("invoice date" stays) | `context:dob` |
| bearer | CREDENTIAL | `\bBearer\s+[A-Za-z0-9._~+\/-]{20,}=*` | high | `bearer-token` |
| password-ctx | CREDENTIAL | `(?:password\|passwd\|pwd\|pin\|otp\|cvv\|cvc)\s*(?:is\|:\|=)?\s*(\S{3,64})` (capture group 1) | medium; **cvv/cvc/otp/pin** values of 3 to 8 digits are high [D] | `context:secret` |
| pem | CREDENTIAL | `-----BEGIN [A-Z ]*PRIVATE KEY-----` then through the matching END line | high; mask the whole block | `private-key-block` |
| aws-key | API_KEY | `\bAKIA[0-9A-Z]{16}\b` | high | `key:aws` |
| google-key | API_KEY | `\bAIza[0-9A-Za-z_-]{35}\b` | high | `key:google` |
| github-token | API_KEY | `\bgh[pousr]_[A-Za-z0-9]{36,}\b` | high | `key:github` |
| sk-key | API_KEY | `\bsk-[A-Za-z0-9_-]{20,}\b` | high | `key:sk` |
| jwt | API_KEY | `\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b` [TV] | high | `key:jwt` |
| amount | AMOUNT | `(?:[$€£₹]\s?\d[\d,]*(?:\.\d{1,2})?\|\b(?:USD\|EUR\|GBP\|INR\|Rs\.?)\s?\d[\d,]*(?:\.\d{1,2})?)` | only when strict mode is on. **Known miss:** suffix currency such as `300 INR` (tested, not matched); add a second pattern if strict mode is shown in the demo | `amount` |
| custom | CUSTOM | user terms, escaped, case-insensitive, word-boundary aware | high | `custom-term` |

### 6.2 US pack

| Id | Type | Pattern | Validator | Notes |
|---|---|---|---|---|
| ssn | TAX_ID | `(?<!\d)(?!000\|666\|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}(?!\d)` | shape rules above (tested: rejects `000-`, `666-`, `9xx-`, `-00-`, `-0000`) | medium; high with keyword `ssn\|social security`. Dash-less 9-digit SSNs only with keyword (too noisy otherwise) |
| routing | ROUTING_OR_IFSC | 9 digits after keyword `routing\|aba\|rtn` | ABA checksum: `3(d1+d4+d7)+7(d2+d5+d8)+(d3+d6+d9) mod 10 = 0` | high if checksum and keyword |
| us-phone | PHONE | `(?<![\d])(?:\+?1[ .-]?)?\(?[2-9]\d{2}\)?[ .-]\d{3}[ .-]\d{4}(?![\d])` | none | medium. Known edge: `202 555 0100x` matches (trailing letter); acceptable, review step shows it |
| ein/itin | TAX_ID | ITIN `9\d{2}-[7-9]\d-\d{4}`; EIN `\d{2}-\d{7}` with keyword | shape | medium [TV] |

### 6.3 IN pack

| Id | Type | Pattern | Validator | Notes |
|---|---|---|---|---|
| pan | TAX_ID | `\b[A-Z]{5}\d{4}[A-Z]\b` | 4th letter is a holder type from `ABCFGHLJPT` [K, TV]; no checksum | high with keyword `pan`, else medium. Lowercase not matched (tested), add case-insensitive only with keyword |
| aadhaar | GOV_ID | `(?<!\d)[2-9]\d{3}[ -]?\d{4}[ -]?\d{4}(?!\d)` | **Verhoeff** checksum over the 12 digits | high if Verhoeff ok; without checksum pass: reject unless keyword `aadhaar\|uid` is present (then medium) |
| ifsc | ROUTING_OR_IFSC | `\b[A-Z]{4}0[A-Z0-9]{6}\b` | shape | medium; high with keyword `ifsc` |
| upi | UPI_ID | `\b[A-Za-z0-9._-]{2,64}@[A-Za-z]{2,32}\b(?!\.[A-Za-z])` | the negative lookahead keeps it from matching email addresses (tested: `x@example.com` yields no UPI match; `test.user@okaxis` matches) | medium; high with keyword `upi\|vpa`. Overlap with EMAIL resolved by merge (longest wins) |
| in-phone | PHONE | `(?<![\d])(?:(?:\+\|00)?91[ -]?)?[6-9]\d{4}[ -]?\d{5}(?![\d])` | first digit 6 to 9 | medium with `+91`, **low** for bare 10-digit runs (tested: `9876543210` matches, `5876543210` does not); bare runs masked only when a phone keyword is nearby or the user accepts in review |
| in-account-ctx | ACCOUNT_NUMBER | same as account-ctx, length 9 to 18 | none | medium |

### 6.4 Context-only person hints (rules, low confidence)
Salutation and signature patterns give Layer 1 a few name hits when Nano is off: `Dear <Capitalized Word(s)>`, `Regards,\n<Name>`, `Name: <...>`, `Mr|Mrs|Ms|Dr <Capitalized>`. Confidence **low**; they only produce review-sheet suggestions, and are masked by default only because PERSON is on [D]. Quality is measured in the eval, not assumed.

## 7. Layer 2: Nano entity extraction (contract)
Full prompt and schema are in `10-AI-PROMPTS-AND-SCHEMAS.md`. Contract for the wrapper:
- Input: one chunk of normalized-for-display text (original characters, not NFKC-folded, to keep substrings matchable [D]).
- Output (validated with a strict schema): `{ entities: [{ text: string, type: EntityType }] }`.
- Post-processing: for each entity, find **every** occurrence of `text` in the chunk (case-sensitive exact first, then case-insensitive), create spans with `source: 'nano'`, `confidence: 'medium'`, discard if `text` is shorter than 2 characters, longer than 120, or purely a placeholder token, discard if not found verbatim.
- Types the model may return are restricted to `PERSON | ORG | ADDRESS | DOB | ACCOUNT_NUMBER | OTHER_ID`; `OTHER_ID` maps to `GOV_ID` with `low`. It cannot return `AMOUNT`.
- Layer 2 never lowers or deletes a rule span (principle 1).

## 8. Merge and mask

1. Collect spans from rules (whole text), Nano (per chunk, shifted), user edits, custom terms.
2. Sort by `start`, then by descending length.
3. Resolve overlaps:
   - Identical range: keep the span with higher confidence; on a tie prefer `rule` over `nano` over `user`, but **always keep the union of reasons**.
   - Containment: the longer span wins, **unless** the shorter one is `high` and the longer is lower than `high` (then keep both separately only if they do not overlap; otherwise split the longer one around the high span) [D]. Example: `john@example.com` (EMAIL, high) inside `john@example.com's account` (PERSON, medium from Nano): EMAIL wins.
   - Partial overlap: keep the span with higher confidence; truncate the other so the union is still masked (never expose the overlap).
4. Mask right to left so offsets stay valid.
5. User spans (`source: 'user'`): "mask this too" and "un-mask" from the review sheet. An un-mask is recorded as an **exclusion** `(start,end,type)`; exclusions apply only to non-`high` spans unless the user confirms a second prompt [D] (so a checksum-valid card cannot be un-masked by a mis-tap).

## 9. Vault, placeholders and the safety gate

### 9.1 Value canonicalization (for "same value → same placeholder")
| Type | Canonical form |
|---|---|
| CARD, ACCT, IBAN, PHONE, GOVID, TAXID, ROUTING, UPI | strip spaces, dashes, dots; uppercase letters |
| EMAIL | lowercase |
| PERSON, ORG, ADDR, TERM | trim, collapse whitespace, case-fold (so `John Smith` and `john smith` share a placeholder) |
| DOB | parsed to ISO if possible, else as-is [TV] |
| SECRET, KEY | exact |

The vault entry stores **all surface forms** seen (original strings) so restore can return the form the user wrote last time [D].

### 9.2 Allocation
- `[LABEL_n]`, `n` starts at 1 per label per conversation, increments per new canonical value.
- **Collision avoidance (threat T-11):** before masking, scan the input for existing tokens matching the placeholder grammar; for each label, the next number is `max(existing n, vault n) + 1`. Existing tokens in the input are left untouched and are recorded as `literal`, which the restorer must never replace.
- A placeholder is never reused for a different value, even after the user removes a message.

### 9.3 Safety gate
Input: the merged, masked text and the original rule detectors. Steps:
1. Re-run **all Layer 1 detectors** on the masked text (normalized again).
2. If any **high** span remains: result is `blocked`, listing remaining spans (by type and position, **not** their values in logs).
3. Check no **vault value** (canonical or any surface form of length ≥ 4 for sensitive types) appears as a substring of the sanitized text, case-insensitive for names. If it does: `blocked`.
4. Check chunk-join risk: re-scan windows of 40 characters across every former chunk boundary after masking (values split across a boundary).
5. Pass: return branded `SanitizedText` and the ledger fields `{ gate: 'passed', remainingMedium: n }`.
- The gate is deterministic, has no model, and has no network.
- Medium/low leftovers pass the gate but appear as warnings; the review step is mandatory when `mode == 'rules-only'` or when any warning exists [D].

## 10. Restore
Algorithm on an answer string `A`:
1. **Exact pass:** replace every `\[[A-Z]{2,8}_\d{1,4}\]` that exists in the vault (and is not `literal`) with the stored surface form.
2. **Tolerant pass** (only on tokens that are not already matched exactly): accept variations of a known token: case differences (`[person_1]`), inner spaces (`[ PERSON_1 ]`, `[PERSON _1]`), markdown escapes (`\[PERSON\_1\]`), fullwidth brackets (`［PERSON_1］`), parentheses or braces instead of brackets (`(PERSON_1)`, `{PERSON_1}`), and the bare token inside backticks. Match only when the normalized token equals a vault token; never fuzzy-match to the "closest" token [D].
3. Unknown tokens (valid grammar, not in the vault) are left as is and counted as `unknownPlaceholders` in the ledger.
4. The restore step runs **after** the answer is complete; during streaming the UI shows placeholders styled as chips and restores at the end (or per completed token) [D].
5. Restore result is logged as counts only: `{ restored, unknown, mangled }`.

Metrics for the eval (doc 06): survival rate (tokens sent that appear in the answer, exact or tolerant), restore success.

## 11. Performance and robustness budget [D, to measure]
| Item | Budget |
|---|---|
| Rules over 10,000 characters | under 50 ms on the dev machine |
| Rules over 100,000 characters | under 500 ms |
| Adversarial 1 MB string against every detector | under 2 s each (backtracking guard) |
| Gate over 10,000 characters | under 50 ms |
| Memory for vault | trivial (kilobytes) |
Nano latency is measured in spike S-5 and reported honestly.

## 12. Synthetic test vectors (all checked on Nov 18, 2026)

Published or generated test values; none belong to a person.

| Kind | Value | Expected |
|---|---|---|
| Card (Visa test) | `4242 4242 4242 4242` | Luhn ok, high |
| Card (Mastercard test) | `5555-5555-5555-4444` | Luhn ok, high |
| Card (Amex test) | `378282246310005` | Luhn ok, high |
| Card (Discover test) | `6011111111111117` | Luhn ok, high |
| Card, bad checksum | `4242424242424241` | **reject** (Luhn fails) |
| Not a card | `order 1234567890123 shipped` | candidate matched by the pattern, **rejected** by Luhn |
| IBAN (GB doc example) | `GB82 WEST 1234 5698 7654 32` | mod-97 ok, high |
| IBAN (DE doc example) | `DE89370400440532013000` | mod-97 ok, high |
| IBAN (FR doc example) | `FR1420041010050500013M02606` | mod-97 ok, high |
| IBAN, bad checksum | `GB82WEST12345698765433` | **reject** |
| Aadhaar (generated, Verhoeff ok) | `5510 0365 7624`, `5038 0503 4513`, `5623 9317 6300` | Verhoeff ok, high |
| Aadhaar, corrupted last digit | `551003657625` | **reject** (Verhoeff fails) |
| PAN | `ABCPE1234F` | match, medium (high with keyword) |
| PAN, wrong shape | `ABCPE12345`, lowercase `abcpe1234f` | no match |
| IFSC | `SBIN0001234` | match |
| US SSN | `123-45-6789` | match; `000-12-3456`, `666-12-3456`, `900-12-3456`, `123-00-6789`, `123-45-0000` rejected |
| ABA routing (generated) | `123456780` | checksum ok; `123456789` fails; `021000021` ok |
| US phone | `(202) 555-0123`, `+1 202.555.0111` | match |
| IN phone | `+91-98765-43210`, `98765 43210` | match; `5876543210` no match |
| E.164 phone | `+44 7700 900123`, `+442079460000` | match |
| Email | `alice.example@example.com` | EMAIL; UPI must **not** also fire as a separate span |
| UPI | `test.user@okaxis` | UPI |
| AWS key shape | `AKIA` + 16 chars from `A-Z0-9` | high |
| Google key shape | `AIza` + 35 chars from `[0-9A-Za-z_-]` (assemble it in the test from parts, e.g. `'AIza' + 'x'.repeat(35)`, so no full key-shaped literal sits in the repo) | high |
| Placeholder-like text | `[PERSON_1]`, `[CARD_12]` | treated as literal tokens; `[x_1]`, `[PERSON_]`, `[A_1]` are not tokens |
| Context account | `Account number: 123456789012 was debited` | ACCT medium; `order number 123456789012` **not** matched |
| Context DOB | `DOB: 14/03/1990`, `born on 1990-03-14`, `Date of birth 14 March 1990` | DOB; `invoice date 14/03/2026` **not** matched |
| Amount (strict mode) | `$12,450.75`, `Rs. 5,000`, `USD 1,200` | AMT; `300 INR` currently **missed** (known gap) |

Notes on test-data safety: the Aadhaar numbers were generated from a seeded random prefix and are valid only by construction of the checksum. A generated number could coincide with a real person's ID in principle; it is not derived from any person and is never presented as real. Fixtures must carry the comment `synthetic`.

## 13. Known false-negative and false-positive classes (documented for the UI and README)
False negatives: names and addresses Nano does not flag; amounts written in words; account numbers without any keyword and without a checksum; identifiers split by line breaks or images; non-Latin scripts for names (Nano quality unknown, [TV]); information that identifies someone indirectly ("the CFO of the company on the second floor").
False positives: order numbers or tracking numbers that pass Luhn by chance (about 1 in 10 random 16-digit numbers pass Luhn), bare 10-digit numbers, capitalized common words treated as names by Nano.
The review step exists for both classes.

## 14. Pack format and extension
A locale pack is a TypeScript module exporting `Detector[]` plus `keywords` and `labels`; no engine change is needed to add one. Packs ship in the bundle (no remote code, hard rule 7). A later stretch may load **data-only** rule packs from Firestore (ADR-010), validated against a schema and never containing executable code [TV].
