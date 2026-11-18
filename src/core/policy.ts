/**
 * Answer Routing Policy Module
 * Refines docs/10-AI-PROMPTS-AND-SCHEMAS.md §9 and ADR-013, ADR-014.
 *
 * Deterministically decides whether an answer request runs ON_DEVICE or IN_CLOUD.
 * Hard Rule: Zero cloud requests without active user consent and kill switch off (Invariant I-6).
 */

import {
  AvailabilityState,
  ConsentState,
  PolicyConfig,
  RoutingDecision,
  SanitizedText,
} from '../shared/types';

export type UserRoutePreference = 'auto' | 'on-device-only' | 'cloud-allowed';

export interface RoutingInputs {
  sanitizedText: SanitizedText;
  consent: ConsentState | null;
  availability: AvailabilityState;
  isOnline: boolean;
  userPreference?: UserRoutePreference;
  config: PolicyConfig;
}

export const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  cloudModel: 'gemini-3.5-flash-lite',
  cloudKillSwitch: false,
  onDeviceTokenBudget: 6000,
  cloudTokenBudget: 24000,
  chunkChars: 1500,
  chunkOverlapChars: 150,
  nanoChunkTimeoutMs: 20000,
  maxInputChars: 30000,
  strictMode: false,
  heavyTaskKeywords: ['analyze', 'compare', 'summarize all', 'spreadsheet'],
  consentVersion: 1,
};

export function decideAnswerRoute(inputs: RoutingInputs): RoutingDecision {
  const { sanitizedText, consent, availability, isOnline, userPreference, config } = inputs;

  // 1. Hard Invariant I-6: Check Consent
  const hasValidConsent =
    consent !== null &&
    consent.cloudAllowed &&
    consent.over18 &&
    consent.regionOk &&
    consent.version >= config.consentVersion;

  // 2. Kill switch check
  if (config.cloudKillSwitch) {
    return {
      route: 'ON_DEVICE',
      reason: 'Remote kill switch active: forced on-device',
    };
  }

  // 3. User explicit on-device mode
  if (userPreference === 'on-device-only') {
    return {
      route: 'ON_DEVICE',
      reason: 'User preference set to on-device only',
    };
  }

  // 4. Connectivity check
  if (!isOnline) {
    return {
      route: 'ON_DEVICE',
      reason: 'Device is offline',
    };
  }

  // 5. If consent is absent, cloud is strictly prohibited (ADR-013)
  if (!hasValidConsent) {
    return {
      route: 'ON_DEVICE',
      reason: 'Cloud consent not granted: using on-device route',
    };
  }

  // 6. If on-device AI is not ready, route to cloud if consent allows
  if (availability !== 'ready') {
    return {
      route: 'IN_CLOUD',
      reason: `On-device AI not ready (${availability}): routed to cloud`,
      modelName: config.cloudModel,
    };
  }

  // 7. Check task complexity and size budgets (rough tokens = chars / 4 per ADR-017)
  const estimatedTokens = Math.ceil(sanitizedText.length / 4);
  const lowerText = sanitizedText.toLowerCase();

  const isHeavyTask = config.heavyTaskKeywords.some((keyword: string) =>
    lowerText.includes(keyword.toLowerCase())
  );

  if (isHeavyTask) {
    return {
      route: 'IN_CLOUD',
      reason: 'Heavy task detected: routed to cloud for thorough analysis',
      modelName: config.cloudModel,
    };
  }

  if (estimatedTokens > config.onDeviceTokenBudget) {
    return {
      route: 'IN_CLOUD',
      reason: `Input exceeds on-device budget (${estimatedTokens} > ${config.onDeviceTokenBudget}): routed to cloud`,
      modelName: config.cloudModel,
    };
  }

  // 8. Default: Prefer on-device for speed & privacy
  return {
    route: 'ON_DEVICE',
    reason: 'Standard task: handled locally on device',
  };
}
