# Privacy Router

A Chrome extension that keeps your personal financial data on your device when you use cloud AI.

> Status: **planning**. No code yet. Entry for #BuildHybridAI 2026.

## Idea
1. You write or paste something that contains financial details.
2. **On-device** (Gemini Nano through Firebase AI Logic) finds the sensitive parts and replaces them with placeholders such as `[PERSON_1]` and `[ACCOUNT_1]`.
3. Only the **sanitized** text goes to the cloud model (Gemini through Firebase AI Logic), or is answered on-device when the task is simple.
4. The answer comes back and the real values are **restored locally**.
5. A **ledger** shows what stayed on your device and what left it.

## Docs
| File | Purpose |
|---|---|
| [docs/01-PRD.md](docs/01-PRD.md) | Problem, users, scope, requirements, success criteria |
| [docs/02-SYSTEM-DESIGN.md](docs/02-SYSTEM-DESIGN.md) | Architecture, pipeline, data model, extension contexts, Firebase usage |
| [docs/03-PRIVACY-THREAT-MODEL.md](docs/03-PRIVACY-THREAT-MODEL.md) | What can leak, controls, residual risks |
| [docs/04-DECISIONS.md](docs/04-DECISIONS.md) | Architecture decision records |
| [docs/05-TASKS.md](docs/05-TASKS.md) | Phased todo list with dates and acceptance criteria |
| [docs/06-TEST-AND-EVAL-PLAN.md](docs/06-TEST-AND-EVAL-PLAN.md) | Tests, metrics, synthetic dataset |
| [docs/07-DEMO-AND-SUBMISSION.md](docs/07-DEMO-AND-SUBMISSION.md) | Hackathon rules, judging map, submission checklist, 3-minute demo script |
| [docs/08-VERIFY-LIST.md](docs/08-VERIFY-LIST.md) | Verified facts, unverified assumptions, open questions |

See [CLAUDE.md](CLAUDE.md) for the working rules.

## License
Apache-2.0 (planned; the LICENSE file is added in task T-0.3).
