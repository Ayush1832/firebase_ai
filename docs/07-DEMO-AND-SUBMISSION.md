# 07 — Hackathon Rules Digest, Demo Script and Submission Checklist

Sources (all read Nov 18, 2026): the official Devpost page text, the **Official Rules page**, the **FAQs page**, the **Resources page** and the discussion threads on firebasehybridaihackathon.devpost.com. Facts are numbered V-1 to V-17 in `08-VERIFY-LIST.md`. This file replaces an earlier version that was based on the overview text only and contained one error (the prize perks, see §1).

## 1. Key facts
- **Event:** #BuildHybridAI 2026, online, administered by Devpost, sponsored by Google. About 3,200 participants at the time of reading.
- **Dates (V-1):** contest period Nov 11, 2026 1:30 PM PT to **Nov 30, 2026 2:00 PM PT** (22:00 UTC). Judging Dec 10 (9:00 AM PT) to Dec 16 (2:00 PM PT). Winners on or around **Dec 21**, 12:00 PM PT. **No extension.**
- **Lock (V-2):** after the deadline the submission is locked and **repo commits pushed afterwards are not evaluated**. Edit freely before.
- **Prizes, $30,000 (V-5):**
  | Prize | Cash | Other |
  |---|---|---|
  | Grand Prize | $10,000 | Interview, Featured Blog Post, Social Media Mention |
  | 1st Runner Up | $7,000 | Featured Blog Post, Social Media Mention (**no interview**) |
  | 2nd Runner Up | $4,000 | Social Media Mention |
  | Best iOS / Best Android / Best Web-Chrome | $3,000 each | Social Media Mention |
  A submission can win **one** grand-tier prize and **up to one** "Best of" prize. Our category is **Best Web/Chrome** plus the overall tiers.
- **Platforms (V-4):** Web (Chrome), Android, iOS. Ours: **Web (Chrome extension).** Only these three count; native macOS/Windows apps do not qualify. A multi-platform solution is preferred, but a strong single-platform entry can win.
- **Eligibility (V-3):** adult in the country of residence; excluded residences: Brazil, Italy, Quebec, Crimea, Cuba, Iran, Syria, North Korea, Sudan, Belarus, Russia and OFAC-sanctioned countries; not staff or family of Google/Devpost/contest entities; not government employees. Every team member must be eligible and added on the Devpost project. India (our country of residence) is not excluded.
- **Free to use, English (V-10, V-14):** the project must be free of charge and unrestricted for the Sponsor, Administrator and Judges until judging ends (Dec 16); all materials in English or with English translations.
- **Google Account Quota (V-16):** optional, only for billing-required models; final request deadline Wed Nov 25 10:00 AM PT; ID verification required. Not needed (text-only design).

## 2. How we are judged (V-6, V-7) and our evidence
**Stage One (pass/fail):** all submission requirements present, reasonably addresses the challenge, reasonably applies the requirements. **Stage Two:** four equally weighted criteria, each scored 1 to 5 and averaged; ties are broken by comparing criterion scores in the order Tech, Design, Impact, Idea, then judge vote. Judges may judge on text, images and video alone (V-10).

| Criterion | Official question (summary) | Evidence to show |
|---|---|---|
| Technological Implementation | How well built; how effectively it uses Firebase AI Logic **hybrid inference** | `ONLY_ON_DEVICE` redaction with SDK-enforced privacy; hybrid answer routing; `inferenceSource` badges; structured output on-device; App Check; Remote Config policy; safety gate; tests including the leak test; measured eval table |
| Design | Complete, coherent product experience, not a proof of concept | Onboarding, review sheet, ledger, settings, every state designed (doc 11); consistent visual system; accessibility pass |
| Potential Impact | Credible specific case, real audience, based on what is demonstrated | Personal-finance scenario shown end to end, who it helps, honest limitations, what leaves vs stays |
| Quality of the Idea | Creative, non-obvious use; genuine understanding of the problem | Privacy boundary as the feature; the FAQ's own guidance (keep sensitive data on-device only, V-13) applied literally; awareness of free-tier data terms (V-35) and how we handle them |

Tie-break note: Tech and Design weigh first in a tie, so polish both.

## 3. Submission requirements checklist
Legend: ☐ not done, ◐ partly, ☑ done. Status as of Nov 18.

- ◐ **Platform selected** (Web/Chrome): saved on the draft.
- ☐ **Text description**: how Firebase AI Logic is used, features and functionality, value proposition (`16-DEVPOST-DRAFT.md` §2).
- ☐ **Public GitHub repo** with all source, assets, run instructions, value proposition, and **Firebase AI Logic imported and actually called at runtime** (not only in the README) (V-8). Repo is public but has docs only.
- ◐ **Open-source license file** detectable and visible in the About section: Apache-2.0 committed (`e4f4505`); GitHub's license API reports Apache-2.0 (V-53); logged-out visual check still to do.
- ☐ **Demo video**, ≤ 3:00, **public on YouTube**, English or subtitled, shows the project working in Chrome; link on the form. Avoid third-party logos/trademarks (V-9).
- ☐ **Testing access**: strongly encouraged; extension build + instructions without secrets (V-10, V-11).
- ☐ **App Check integrated** (debug token accepted, V-12) and **no tokens/keys committed** (V-11).
- ☐ **Other Firebase products** where sensible (Remote Config, Auth; Firestore optional).
- ◐ **Team members added on Devpost**: two members shown. Each must tick their own attestations (V-3).
- ☐ **"What we built during the submission period"**: not needed (new project, started Nov 18 after Nov 11); disclose any pre-existing code (none planned) and list major libraries (V-14).
- ☐ **Re-read** Official Rules before submitting (done once Nov 18; check for rule updates in the Updates tab).
- ☐ **Submit by end of Nov 29** (PT); Nov 30 is buffer only; deadline is 2:00 PM PT sharp.

### Hidden-requirement traps found in the rules
1. No production keys, secrets, PII in the **repo, form or testing instructions** (V-11).
2. Commits after the deadline are ignored (V-2): tag `submission-v1` and stop.
3. The project must stay accessible and free until Dec 16 (V-10): keep the Firebase project and quota alive; do not delete the repo.
4. Third-party SDKs/APIs must be authorized under their terms and licenses (V-14): list dependencies and licenses in the README.
5. YouTube video must be **public** and uploaded early; processing can take hours (V-9).
6. The Gemini API terms (V-35 to V-38) restrict minors and EEA/UK/CH users on the free tier; our consent gate (ADR-013) and README must say so.
7. Winners need identity verification and signed declarations (V-15): both members must be reachable until about Dec 21.

## 4. Demo video script (target 2:40, hard cap 3:00)
FAQ advice from the Firebase team: the **first 30 seconds** should show the idea, who it is for, the problem, and how Firebase AI Logic makes it work; judges may evaluate from the video alone, so show the hybrid features early (V-9). The script is rebuilt around that.

Scenario: personal finance, **synthetic data only**. No personal accounts, tabs, bookmarks or notifications visible.

| Time | Scene | Voiceover (gist) |
|---|---|---|
| 0:00–0:10 | Title card, then a pasted dispute email with a name, card number and account number | "People paste this into AI every day. Once it's sent, it's gone." |
| 0:10–0:30 | Side panel opens; one-sentence architecture strip: device → mask → cloud → restore | "Privacy Router finds sensitive data on your device with Gemini Nano through Firebase AI Logic. Only masked text can reach the cloud." |
| 0:30–1:00 | Press send; "analyzing on your device"; review sheet with highlights; un-mask one, mask a missed name manually | "Rules catch structured data like cards and IBANs. The on-device model finds names and addresses. You stay in control." |
| 1:00–1:30 | Send; answer arrives with real values restored; open ledger: ON-DEVICE and CLOUD badges, counts, "Raw text left your device: No" | "Hybrid inference: redaction runs on-device only; the answer came from the cloud with placeholders; values were restored locally." |
| 1:30–1:50 | DevTools Network briefly: request body shows placeholders only | "Here is exactly what the cloud received." |
| 1:50–2:10 | Airplane mode: ask again; route switches to on-device; ledger updates | "No connection? It still works, entirely on-device." |
| 2:10–2:30 | Guard on a prompt box (see logo rule below): preview "5 items masked", confirm | "Same protection in front of the AI tools you already use." |
| 2:30–2:50 | Architecture slide; limitations line; consent/free-tier note; repo link | "Hybrid inference, Remote Config policy, App Check, open source. Detection isn't perfect, so you always get a review step." |

**Logo/trademark rule (V-9, TV-20, R-31):** FAQ says to avoid third-party logos, trademarks or content we lack rights to. For the guard scene, prefer a local mock page or a tightly cropped view of the prompt box with logos hidden/blurred, and keep named third-party UI out of frame. Do not show other AI products' branding. Google/Firebase branding belongs to the sponsor; keep it minimal and factual.

Recording rules: synthetic data only; English narration or subtitles; show Chrome (the platform); ≤ 3:00 (only the first 3 minutes count); record at 1080p; panel text at least 14 px (zoom to 125% if needed); disable notifications; hide bookmarks and extra tabs; consistent cursor; keep a clean Chrome profile.

### 4.1 Video production checklist
- ☐ Script locked and timed (read aloud to ≤ 2:45).
- ☐ Demo data pre-written (synthetic), sample button works, model already downloaded, Remote Config warmed.
- ☐ Rehearse airplane-mode toggle twice (S-9).
- ☐ Record screen at 1080p (macOS screen capture) plus narration; trim; add English captions (YouTube auto-captions then fix).
- ☐ Title card + architecture slide (no third-party logos).
- ☐ Upload to YouTube **public**, **by Nov 29 morning**; check processing finished and the link works **logged out** (V-9).
- ☐ Put the final URL in the Devpost form and re-open the form to confirm it saved (V-52).

## 5. Quality bar for "complete product" (Design criterion)
- First-run onboarding reaches a first masked chat in under 2 minutes.
- Every state in doc 11 §7 has a designed message.
- No placeholder text, lorem ipsum, dead buttons or console errors in the demo path.
- Consistent naming and copy (doc 11 §5); about page lists version, license, limitations.
- README has screenshots, install steps and a short architecture diagram.

## 6. Devpost description skeleton
See `16-DEVPOST-DRAFT.md` §2 for the full draft. Structure: one-line pitch; the problem; what it does (5 steps); how we use Firebase AI Logic; privacy guarantees and honest limitations (including the free-tier note); how to try it; what's next. Fill with **measured** numbers only.
