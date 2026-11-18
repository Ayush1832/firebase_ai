# Privacy Router

A Chrome extension that keeps your personal financial data on your device when you use cloud AI.

> **Status: planning and research are complete; implementation has not started.** There is no installable build yet. Entry for **#BuildHybridAI 2026** (Web/Chrome platform). Deadline: Nov 30, 2026, 2:00 PM PT.

## Idea
1. You write or paste something that contains financial details.
2. **On-device** (Gemini Nano through Firebase AI Logic, `ONLY_ON_DEVICE`) and deterministic rules find the sensitive parts and replace them with placeholders such as `[PERSON_1]` and `[CARD_1]`.
3. You **review** the masked text. A deterministic safety gate checks it again.
4. Only the **sanitized** text goes to the answer model: on-device when the task is simple or you are offline, or Gemini in the cloud (through Firebase AI Logic) **if you have opted in**.
5. The answer comes back and the real values are **restored locally**.
6. A **ledger** shows what stayed on your device, what left it, and which model handled each step.

## Honest limitations (read these)
- No detector is perfect. Names and addresses can be missed. That is why you always get a review step, and why we never claim "100% private".
- **Cloud answers are opt-in.** On Google's free Gemini API tier, content sent to the API may be used to improve Google products and may be read by human reviewers, and Google's terms say not to submit sensitive or personal information to it. Masking reduces what could be seen but cannot guarantee anything. The free tier is also limited to adults and is not available for users in the EEA, Switzerland or the UK. Source: Gemini API Additional Terms (read Nov 18, 2026). On-device-only mode needs no cloud at all.
- On-device AI needs desktop Chrome 139+, a supported machine, and roughly 22 GB of free disk for Chrome's model download. Without it the extension runs rules-only with a reduced-confidence warning and mandatory review.
- The guard for third-party AI sites reduces what is **submitted**; it cannot hide what you already typed into a page.

## How we use Firebase AI Logic (planned design)
- Redaction: `InferenceMode.ONLY_ON_DEVICE` (throws instead of falling back to the cloud).
- Answers: hybrid routing (`PREFER_ON_DEVICE` or `ONLY_IN_CLOUD`) on sanitized text only; `inferenceSource` recorded in the ledger.
- Also App Check (required), Remote Config (policy with offline defaults) and anonymous Auth.

## Docs
Start with [CLAUDE.md](CLAUDE.md) (working rules), then:

| File | Purpose |
|---|---|
| [docs/01-PRD.md](docs/01-PRD.md) | Problem, personas, scope, requirements, user stories, success criteria |
| [docs/02-SYSTEM-DESIGN.md](docs/02-SYSTEM-DESIGN.md) | Architecture, pipeline, data model, state machines, Firebase usage |
| [docs/03-PRIVACY-THREAT-MODEL.md](docs/03-PRIVACY-THREAT-MODEL.md) | What can leak, controls, residual risks, data-flow inventory |
| [docs/04-DECISIONS.md](docs/04-DECISIONS.md) | Architecture decision records (ADR-001 to ADR-022) |
| [docs/05-TASKS.md](docs/05-TASKS.md) | Phased task list with dates, estimates, acceptance criteria |
| [docs/06-TEST-AND-EVAL-PLAN.md](docs/06-TEST-AND-EVAL-PLAN.md) | Tests, privacy tests L-1 to L-11, synthetic corpus, metrics |
| [docs/07-DEMO-AND-SUBMISSION.md](docs/07-DEMO-AND-SUBMISSION.md) | Official rules digest, judging, submission checklist, demo script |
| [docs/08-VERIFY-LIST.md](docs/08-VERIFY-LIST.md) | Verified facts with sources, unverified assumptions, open questions, corrections log |
| [docs/09-DETECTOR-SPEC.md](docs/09-DETECTOR-SPEC.md) | Detection, masking, vault, gate and restore specification with test vectors |
| [docs/10-AI-PROMPTS-AND-SCHEMAS.md](docs/10-AI-PROMPTS-AND-SCHEMAS.md) | Model instances, prompts, schemas, error handling, routing |
| [docs/11-UX-SPEC.md](docs/11-UX-SPEC.md) | Screens, states, copy, accessibility |
| [docs/12-EXTENSION-SPEC.md](docs/12-EXTENSION-SPEC.md) | Manifest, contexts, messaging, storage, guard framework, build |
| [docs/13-SETUP-GUIDE.md](docs/13-SETUP-GUIDE.md) | Firebase, Chrome flags, profile, Remote Config parameters, troubleshooting |
| [docs/14-SPIKE-PLAYBOOKS.md](docs/14-SPIKE-PLAYBOOKS.md) | Step-by-step risk spikes and the go/no-go gate |
| [docs/15-RISK-REGISTER.md](docs/15-RISK-REGISTER.md) | Technical, privacy, rules and schedule risks with plans B |
| [docs/16-DEVPOST-DRAFT.md](docs/16-DEVPOST-DRAFT.md) | Devpost form map, current draft state, final texts |

Evidence labels used in the docs: **[V]** verified from a named source, **[TV]** to verify, **[K]** general knowledge not re-checked, **[D]** our decision.

## Quick start
Not available yet. Planned: install Node, run `npm install` and `npm run build`, load `dist/` as an unpacked extension, and follow [docs/13-SETUP-GUIDE.md](docs/13-SETUP-GUIDE.md) to create a free Firebase project and enable Chrome's on-device model.

## License
[Apache-2.0](LICENSE).
