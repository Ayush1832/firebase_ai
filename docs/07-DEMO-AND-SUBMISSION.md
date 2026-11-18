# 07 — Hackathon Rules Digest, Demo Script and Submission Checklist

Source: the official Devpost page text, copied by hand on Nov 18, 2026. The full Official Rules page was **not** read (Devpost blocks automated fetches); read it before submitting: eligibility, prize stacking, IP and publicity terms.

## 1. Key facts
- Event: **#BuildHybridAI 2026**, online, managed by Devpost, sponsored by Google. About 3,200 participants at the time of reading.
- Deadline: **Nov 30, 2026, 2:00 PM PST** (22:00 UTC).
- Prizes ($30,000): Grand Prize $10,000; 1st runner up $7,000; 2nd runner up $4,000; Best iOS App $3,000; Best Android App $3,000; Best Web/Chrome App $3,000. The Grand Prize and 1st runner-up also include an interview and a featured blog post from the Firebase team; all prizes include a social media mention.
- Platforms (pick at least one; the submission is associated with the platform selected, and organizers may reassign it): Web (Chrome) or Android with Gemini Nano 4 via Firebase AI Logic; iOS with Apple Foundation Models via Firebase AI Logic. Web includes Chrome extensions. **Our platform: Web/Chrome (extension).**
- Multi-platform apps get strong Grand Prize consideration; an outstanding single-platform app can still win.
- Can submit more than one project if substantially different. All materials in English. Must be free to use.
- Google Account Quota (optional, for e.g. image generation): requests close Wed Nov 25 10:00 AM PT for the final sprint; each account lasts 4 days. Not needed for our text-only design.

## 2. Judging criteria and our evidence
| Criterion | Official question | Evidence to show |
|---|---|---|
| Technological Implementation | How well built, how effectively it uses Firebase AI Logic hybrid inference | `ONLY_ON_DEVICE` redaction, hybrid routing, `inferenceSource` in the ledger, App Check, Remote Config policy, safety gate, tests |
| Design | Complete, coherent product, not a proof of concept | Onboarding, review sheet, ledger, settings, all states |
| Potential Impact | Credible, specific case for a real audience, based on what is demonstrated | Personal-finance scenario shown end to end |
| Quality of the Idea | Creative, non-obvious use of Firebase AI Logic; real understanding of the problem | Trust layer with a visible privacy boundary; honest limitations |

## 3. Submission requirements checklist (from the page)
- [ ] Built with Firebase AI Logic; App Check integrated (debug token accepted).
- [ ] Uses other Firebase products where sensible (Remote Config, Auth; Firestore optional).
- [ ] Platform selected on the submission form (Web/Chrome).
- [ ] Text description: how Firebase AI Logic is used, features and functionality, value proposition.
- [ ] Public GitHub (or GitLab) repo with all source, assets and instructions; shows value proposition; **Firebase AI Logic imported and actually called at runtime in code** (not only mentioned in the README).
- [ ] Open-source license file, detectable and visible in the repo's About section (Apache-2.0 planned).
- [ ] Demo video: shows the project working on the platform (Chrome), **≤ 3:00** (only the first 3 minutes are evaluated), public on YouTube, English or English subtitles, link on the form.
- [ ] Strongly encouraged: a URL for judging/testing (extension package or hosted page; hosted is "highly encouraged").
- [ ] Strongly encouraged: use Google IDEs/agent skills (optional; any tool is allowed as long as AI runs on Firebase AI Logic).
- [ ] All materials in English; free to use.
- [ ] If an existing app was used: summary of what was built in the submission period (N/A, new project).
- [ ] Team members registered on Devpost if a team.
- [ ] Re-read Official Rules (eligibility, IP, publicity) before submitting.

## 4. Demo video script (target 2:40, hard cap 3:00)
Scenario: personal finance, synthetic data only.

| Time | Scene | Voiceover (gist) |
|---|---|---|
| 0:00–0:15 | Title plus a pasted dispute email containing a name, card number and account number | "People paste this into AI every day. Once it's sent, it's gone." |
| 0:15–0:35 | Open the side panel, paste text, press send; progress shows "analyzing on your device" | "Privacy Router finds sensitive data on your device first, using Gemini Nano through Firebase AI Logic." |
| 0:35–1:05 | Review sheet: highlighted items, un-mask one, mask a missed name manually | "Rules catch structured data like cards and IBANs. The on-device model finds names and addresses. You stay in control." |
| 1:05–1:35 | Send; answer appears with real values restored; open the ledger: badges ON-DEVICE and CLOUD, counts, "Raw text left device: No" | "Only the sanitized text reached the cloud. The real values were restored locally." |
| 1:35–2:00 | DevTools Network (briefly) showing the request body with placeholders only | "Here is what the cloud actually received." |
| 2:00–2:20 | Airplane mode: ask again; route switches to on-device; ledger updates | "No connection? It still works, entirely on-device." |
| 2:20–2:40 | Guard on a supported AI site: preview "5 items masked", confirm | "Same protection in front of the AI tools you already use." |
| 2:40–2:55 | Architecture slide plus honest limitation line plus repo link | "Hybrid inference, Remote Config policy, App Check, open source." |

Rules for the recording: synthetic data only, no personal accounts or tabs visible, English narration or subtitles, show Chrome (the platform), keep under 3:00.

## 5. Devpost description skeleton
1. One-line pitch.
2. The problem (who, what, why now).
3. What it does (pipeline in 5 steps).
4. How we use Firebase AI Logic (`ONLY_ON_DEVICE` redaction, hybrid answer routing, `inferenceSource`), plus App Check, Remote Config, Auth.
5. Privacy guarantees and honest limitations.
6. How to try it (install steps, test text).
7. What's next (companion app).
Fill in with measured numbers only (see the test plan results table).
