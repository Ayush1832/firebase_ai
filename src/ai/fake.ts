/**
 * Fake AI Port for Unit Testing, CI, and Leak Verification
 * Refines docs/06-TEST-AND-EVAL-PLAN.md §2.
 */

import { AvailabilityState, SanitizedText } from '../shared/types';
import { AiPort, RawEntityCandidate } from './types';

export interface FakeAiOptions {
  availability?: AvailabilityState;
  redactorInferenceSource?: 'ON_DEVICE' | 'IN_CLOUD';
  answerInferenceSource?: 'ON_DEVICE' | 'IN_CLOUD';
  simulatedEntities?: RawEntityCandidate[];
  throwOnRedact?: boolean;
  timeoutOnRedact?: boolean;
  mangledAnswerPlaceholders?: boolean;
}

export class FakeAiPort implements AiPort {
  public availabilityState: AvailabilityState;
  public redactorInferenceSource: 'ON_DEVICE' | 'IN_CLOUD';
  public answerInferenceSource: 'ON_DEVICE' | 'IN_CLOUD';
  public simulatedEntities: RawEntityCandidate[];
  public throwOnRedact: boolean;
  public timeoutOnRedact: boolean;
  public mangledAnswerPlaceholders: boolean;

  // Network spy tracking outbound requests (L-1 Leak Test)
  public outboundRequests: { prompt: string; route: string; ts: number }[] = [];

  constructor(options: FakeAiOptions = {}) {
    this.availabilityState = options.availability ?? 'ready';
    this.redactorInferenceSource = options.redactorInferenceSource ?? 'ON_DEVICE';
    this.answerInferenceSource = options.answerInferenceSource ?? 'ON_DEVICE';
    this.simulatedEntities = options.simulatedEntities ?? [];
    this.throwOnRedact = options.throwOnRedact ?? false;
    this.timeoutOnRedact = options.timeoutOnRedact ?? false;
    this.mangledAnswerPlaceholders = options.mangledAnswerPlaceholders ?? false;
  }

  async checkAvailability(): Promise<AvailabilityState> {
    return this.availabilityState;
  }

  async initializeDeviceModel(onProgress: (percent: number) => void): Promise<void> {
    onProgress(25);
    onProgress(50);
    onProgress(100);
    this.availabilityState = 'ready';
  }

  async redactOnDevice(
    chunk: string,
    timeoutMs: number = 20000
  ): Promise<{ entities: RawEntityCandidate[]; inferenceSource: 'ON_DEVICE' | 'IN_CLOUD' }> {
    if (this.throwOnRedact) {
      throw new Error('Fake AI on-device session crashed.');
    }
    if (this.timeoutOnRedact) {
      await new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), 50)
      );
    }

    // If explicit simulated entities provided, use them
    if (this.simulatedEntities.length > 0) {
      return {
        entities: this.simulatedEntities,
        inferenceSource: this.redactorInferenceSource,
      };
    }

    // Default heuristic for mock: extract Capitalized Pairs as PERSON and standard address words
    const entities: RawEntityCandidate[] = [];
    const nameMatch = /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g;
    let m: RegExpExecArray | null;
    while ((m = nameMatch.exec(chunk)) !== null) {
      entities.push({ text: m[1], type: 'PERSON' });
    }

    return {
      entities,
      inferenceSource: this.redactorInferenceSource,
    };
  }

  async answer(
    sanitized: SanitizedText,
    route: 'ON_DEVICE' | 'IN_CLOUD',
    _modelName?: string
  ): Promise<{ text: string; inferenceSource: 'ON_DEVICE' | 'IN_CLOUD' }> {
    // Record outbound request for privacy spy / leak test
    this.outboundRequests.push({
      prompt: sanitized,
      route,
      ts: Date.now(),
    });

    let response = `Assistant answer for: ${sanitized}`;
    if (this.mangledAnswerPlaceholders) {
      response = response.replace(/\[([A-Z]+)_(\d+)\]/g, '[$1 _$2]');
    }

    return {
      text: response,
      inferenceSource: route === 'ON_DEVICE' ? 'ON_DEVICE' : 'IN_CLOUD',
    };
  }
}
