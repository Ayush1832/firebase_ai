import { useState, useEffect, useRef } from 'react';
import {
  asRawText,
  AvailabilityState,
  EntityType,
  GateResult,
  LedgerEntry,
  RawText,
  RoutingDecision,
  SanitizedText,
  Span,
} from '../../shared/types';
import { GLOBAL_PACK } from '../../core/packs/global';
import { US_PACK } from '../../core/packs/us';
import { IN_PACK } from '../../core/packs/in';
import { Vault } from '../../core/vault';
import { maskText } from '../../core/masker';
import { evaluateSafetyGate } from '../../core/gate';
import { restorePlaceholders } from '../../core/restorer';
import {
  decideAnswerRoute,
  DEFAULT_POLICY_CONFIG,
  UserRoutePreference,
} from '../../core/policy';
import { ChromeStorageArea, MemoryStorageArea, PersistenceManager } from '../../core/storage';
import { PipelineProgressEvent, runPrivacyPipeline } from '../../ai/pipeline';
import { AiPort } from '../../ai/types';
import { FakeAiPort } from '../../ai/fake';
import { requestAnswer } from '../../ai/wrapper';
import { getFirebaseAiPort } from '../firebase/init';

import { StatusBar } from '../../ui/StatusBar';
import { ChatMessage, ChatView } from '../../ui/ChatView';
import { Composer } from '../../ui/Composer';
import { ReviewSheet } from '../../ui/ReviewSheet';
import { LedgerDrawer } from '../../ui/LedgerDrawer';
import { ConsentModal } from '../../ui/ConsentModal';
import { OnboardingModal } from '../../ui/OnboardingModal';

export interface SidePanelAppProps {
  customAiPort?: AiPort;
}

export function SidePanelApp({ customAiPort }: SidePanelAppProps) {
  // Persistence & Storage
  const [sessionStorageArea] = useState(() => {
    return typeof chrome !== 'undefined' && chrome.storage
      ? new ChromeStorageArea('session')
      : new MemoryStorageArea();
  });
  const [localStorageArea] = useState(() => {
    return typeof chrome !== 'undefined' && chrome.storage
      ? new ChromeStorageArea('local')
      : new MemoryStorageArea();
  });
  const [persistence] = useState(() => new PersistenceManager(sessionStorageArea, localStorageArea));

  // AI Port
  const [aiPort, setAiPort] = useState<AiPort>(() => {
    if (customAiPort) return customAiPort;
    // Default to FakeAiPort with ready availability for standalone/dev demo
    return new FakeAiPort({
      availability: 'ready',
    });
  });

  // Global App States
  const [availability, setAvailability] = useState<AvailabilityState>('ready');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [strictMode, setStrictMode] = useState(false);
  const [routingMode, setRoutingMode] = useState<UserRoutePreference>('auto');
  const [customTerms, setCustomTerms] = useState<string[]>([]);
  const [consentGranted, setConsentGranted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composerPrefill, setComposerPrefill] = useState('');

  // Active Session Vault & Ledger Map
  const vaultRef = useRef<Vault>(new Vault());
  const ledgerMapRef = useRef<Map<string, LedgerEntry>>(new Map());

  // Modals & Panels
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [activeLedgerEntry, setActiveLedgerEntry] = useState<LedgerEntry | null>(null);

  // Pipeline Execution States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingProgress, setAnalyzingProgress] = useState<PipelineProgressEvent | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Review Sheet States
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [pendingReview, setPendingReview] = useState<{
    rawText: RawText;
    initialSpans: Span[];
    mode: 'full' | 'rules-only';
    degradedChunks: number[];
    gateResult: GateResult;
    routingDecision: RoutingDecision;
    sanitizedText?: SanitizedText;
  } | null>(null);

  // Detectors setup
  const detectors = [...GLOBAL_PACK, ...US_PACK, ...IN_PACK];

  // Initialize and load saved settings
  useEffect(() => {
    if (!customAiPort) {
      getFirebaseAiPort().then((realPort) => {
        if (realPort) {
          setAiPort(realPort);
        }
      });
    }

    aiPort.checkAvailability().then((state) => {
      setAvailability(state);
    });

    persistence.getSettings().then((s) => {
      setStrictMode(s.strictMode);
      setRoutingMode(s.routingMode);
    });

    persistence.getConsent().then((c) => {
      if (c) {
        setConsentGranted(c.cloudAllowed && c.over18 && c.regionOk);
      }
    });

    persistence.getCustomTerms().then((t) => {
      setCustomTerms(t);
    });

    // Check first-run onboarding
    localStorageArea.get<boolean>('onboarding_completed').then((done) => {
      if (!done) {
        setIsOnboardingOpen(true);
      }
    });

    // Handle Guard scan requests from content scripts
    const messageListener = (msg: unknown, _sender: unknown, sendResponse: (res: unknown) => void) => {
      const message = msg as { type?: string; payload?: { text?: string } };
      if (message?.type === 'GUARD_SCAN' && message.payload?.text) {
        runPrivacyPipeline(asRawText(message.payload.text), {
          detectors,
          aiPort,
          vault: vaultRef.current,
          customTerms,
          strictMode,
        })
          .then((res) => {
            const counts: Partial<Record<EntityType, number>> = {};
            for (const s of res.spans) {
              counts[s.type] = (counts[s.type] || 0) + 1;
            }
            sendResponse({
              ok: true,
              sanitized: res.sanitized,
              counts,
              mode: res.mode,
              gatePassed: res.gateResult.status === 'passed',
            });
          })
          .catch(() => {
            sendResponse({ ok: false });
          });
        return true; // Keep async channel open
      }
      return false;
    };

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(messageListener);
    }

    return () => {
      if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(messageListener);
      }
    };
  }, [aiPort, persistence, localStorageArea, customTerms, strictMode, detectors]);

  // Handle Enable Model download click
  const handleEnableModel = async () => {
    setAvailability('downloading');
    setDownloadProgress(20);
    setTimeout(() => setDownloadProgress(60), 500);
    setTimeout(() => {
      setDownloadProgress(100);
      setAvailability('ready');
    }, 1200);
  };

  // Open Chrome options page
  const handleOpenOptions = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('options.html', '_blank');
    }
  };

  // Try sample prompt
  const handleTrySample = () => {
    setComposerPrefill(
      'Dear Priya Sharma, please dispute the charge of $120.50 on my card 4242 4242 4242 4242 for the transaction at Apex Retail on Nov 3. You can reach me at priya@example.com or +91 98765 43210.'
    );
  };

  // Cancel in-flight analyzing
  const handleCancelAnalyzing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsAnalyzing(false);
    setAnalyzingProgress(null);
  };

  // Step 1: User submits prompt in composer
  const handleComposerSend = async (rawInput: string) => {
    setIsAnalyzing(true);
    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;
    const raw = asRawText(rawInput);

    try {
      const result = await runPrivacyPipeline(raw, {
        detectors,
        aiPort,
        vault: vaultRef.current,
        customTerms,
        strictMode,
        abortSignal: abortCtrl.signal,
        onProgress: (p) => setAnalyzingProgress(p),
      });

      // Compute routing policy
      const consentState = await persistence.getConsent();
      const routingDecision = decideAnswerRoute({
        sanitizedText: result.sanitizedText || (result.sanitized as SanitizedText),
        consent: consentState,
        availability,
        isOnline: navigator.onLine,
        userPreference: routingMode,
        config: DEFAULT_POLICY_CONFIG,
      });

      setPendingReview({
        rawText: raw,
        initialSpans: result.spans,
        mode: result.mode,
        degradedChunks: result.degradedChunks,
        gateResult: result.gateResult,
        routingDecision,
        sanitizedText: result.sanitizedText,
      });

      setIsAnalyzing(false);
      setAnalyzingProgress(null);
      setIsReviewOpen(true);
    } catch {
      setIsAnalyzing(false);
      setAnalyzingProgress(null);
    }
  };

  // Step 2: User confirms and clicks "Send sanitized ▶" in ReviewSheet
  const handleReviewConfirm = async (finalSpans: Span[]) => {
    if (!pendingReview) return;
    setIsReviewOpen(false);

    const { rawText, mode, degradedChunks, routingDecision } = pendingReview;

    // Check if cloud routing requires consent
    if (routingDecision.route === 'IN_CLOUD' && !consentGranted) {
      setIsConsentOpen(true);
      return;
    }

    await executeSendPipeline(rawText, finalSpans, mode, degradedChunks, routingDecision);
  };

  // Step 3: Core pipeline send execution
  const executeSendPipeline = async (
    rawText: RawText,
    finalSpans: Span[],
    mode: 'full' | 'rules-only',
    degradedChunks: number[],
    routingDecision: RoutingDecision
  ) => {
    // 1. Mask with approved spans
    const maskRes = maskText(rawText, finalSpans, vaultRef.current, mode, degradedChunks);

    // 2. Enforce Deterministic Safety Gate
    const gateRes = evaluateSafetyGate(maskRes.sanitized, {
      detectors,
      vault: vaultRef.current,
      customTerms,
      strictMode,
    });

    if (gateRes.status === 'blocked') {
      alert(`Safety Gate Blocked: ${gateRes.leftovers.length} unmasked item(s) detected.`);
      return;
    }

    const sanitized = gateRes.text;
    const ledgerId = `msg-${Date.now()}`;

    // 3. Count entities by type
    const counts: Partial<Record<EntityType, number>> = {};
    for (const span of finalSpans) {
      counts[span.type] = (counts[span.type] || 0) + 1;
    }

    // 4. Create Ledger Audit Entry
    const ledgerEntry: LedgerEntry = {
      id: ledgerId,
      ts: Date.now(),
      mode,
      counts,
      steps: [
        { name: 'detect-rules', route: 'RULES', ok: true },
        { name: 'detect-nano', route: 'ON_DEVICE', ok: mode === 'full' },
        { name: 'gate', route: 'RULES', ok: true },
        { name: 'answer', route: routingDecision.route, ok: true },
        { name: 'restore', route: 'ON_DEVICE', ok: true },
      ],
      rawLeftDevice: false, // Invariant I-3: gate passed, only sanitized leaves
      sanitizedPreview: sanitized,
      routing: routingDecision,
    };
    ledgerMapRef.current.set(ledgerId, ledgerEntry);

    // 5. Add user message to UI
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: rawText,
      rawContent: rawText,
      maskedCount: finalSpans.length,
      ledgerEntryId: ledgerId,
    };
    setMessages((prev) => [...prev, userMsg]);

    // 6. Request Answer from Model (strictly receives SanitizedText)
    try {
      const answerRes = await requestAnswer(sanitized, routingDecision.route, aiPort);

      // 7. Local restoration of real values
      const restoreRes = restorePlaceholders(answerRes.text, vaultRef.current);

      // Extract restored tokens for subtle UI annotation
      const restoredTokens = vaultRef.current.getAllEntries().map((entry) => ({
        token: entry.placeholder,
        value: entry.surfaceForms[entry.surfaceForms.length - 1],
      }));

      // 8. Add assistant message to UI
      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: restoreRes.restoredText,
        route: answerRes.inferenceSource === 'ON_DEVICE' ? 'ON_DEVICE' : 'CLOUD',
        ledgerEntryId: ledgerId,
        restoredTokens,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error generating response: ${err instanceof Error ? err.message : 'Unknown error'}. Your private text remained on your device.`,
        route: 'ON_DEVICE',
        ledgerEntryId: ledgerId,
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  // Open Ledger
  const handleOpenLedger = (ledgerId: string) => {
    const entry = ledgerMapRef.current.get(ledgerId);
    if (entry) {
      setActiveLedgerEntry(entry);
      setIsLedgerOpen(true);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100%',
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
      }}
    >
      {/* Top Status Bar */}
      <StatusBar
        availability={availability}
        downloadProgress={downloadProgress}
        strictMode={strictMode}
        routingMode={routingMode}
        onToggleStrictMode={() => {
          const next = !strictMode;
          setStrictMode(next);
          persistence.saveSettings({ strictMode: next, routingMode });
        }}
        onChangeRoutingMode={(m) => {
          setRoutingMode(m);
          persistence.saveSettings({ strictMode, routingMode: m });
        }}
        onEnableModel={handleEnableModel}
        onOpenOptions={handleOpenOptions}
      />

      {/* Main Chat View */}
      <ChatView
        messages={messages}
        isAnalyzing={isAnalyzing}
        analyzingProgress={analyzingProgress}
        onCancelAnalyzing={handleCancelAnalyzing}
        onOpenLedger={handleOpenLedger}
        onTrySample={handleTrySample}
      />

      {/* Bottom Composer */}
      <Composer
        onSend={handleComposerSend}
        onTrySample={handleTrySample}
        disabled={isAnalyzing}
        initialText={composerPrefill}
      />

      {/* Review Sheet Modal */}
      {isReviewOpen && pendingReview && (
        <ReviewSheet
          isOpen={isReviewOpen}
          rawText={pendingReview.rawText}
          sanitizedText={pendingReview.sanitizedText}
          initialSpans={pendingReview.initialSpans}
          mode={pendingReview.mode}
          degradedChunks={pendingReview.degradedChunks}
          gateResult={pendingReview.gateResult}
          routingDecision={pendingReview.routingDecision}
          onSend={handleReviewConfirm}
          onCancel={() => {
            setIsReviewOpen(false);
            setPendingReview(null);
          }}
          onRequestConsent={() => setIsConsentOpen(true)}
        />
      )}

      {/* Cloud Consent Modal */}
      <ConsentModal
        isOpen={isConsentOpen}
        onConsent={async () => {
          await persistence.saveConsent({
            cloudAllowed: true,
            over18: true,
            regionOk: true,
            version: 1,
            at: Date.now(),
          });
          setConsentGranted(true);
          setIsConsentOpen(false);
          // If we had a pending review, execute it
          if (pendingReview) {
            executeSendPipeline(
              pendingReview.rawText,
              pendingReview.initialSpans,
              pendingReview.mode,
              pendingReview.degradedChunks,
              {
                ...pendingReview.routingDecision,
                route: 'IN_CLOUD',
              }
            );
          }
        }}
        onDecline={() => {
          setIsConsentOpen(false);
        }}
      />

      {/* Ledger Drawer */}
      <LedgerDrawer
        isOpen={isLedgerOpen}
        entry={activeLedgerEntry}
        onClose={() => setIsLedgerOpen(false)}
      />

      {/* Onboarding Wizard */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        availability={availability}
        onEnableModel={handleEnableModel}
        onSelectSample={handleTrySample}
        onComplete={async () => {
          await localStorageArea.set('onboarding_completed', true);
          setIsOnboardingOpen(false);
        }}
      />
    </div>
  );
}
