/**
 * Firebase AI Logic Implementation of AiPort
 * Refines docs/10-AI-PROMPTS-AND-SCHEMAS.md §1 & §1.1.
 * Confined strictly to src/ai/ per architectural rule.
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  GenerativeModel,
} from 'firebase/ai';
import { AvailabilityState, SanitizedText } from '../shared/types';
import {
  AiPort,
  ENTITY_SCHEMA,
  RawEntityCandidate,
  REDACTOR_SYSTEM_PROMPT,
  RESPONDER_SYSTEM_PROMPT,
} from './types';

export interface FirebaseAiConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  cloudModel?: string;
}

export class FirebaseAiPort implements AiPort {
  private app: FirebaseApp;
  private redactor: GenerativeModel;
  private responderHybrid: GenerativeModel;
  private responderCloud: GenerativeModel;

  constructor(config: FirebaseAiConfig) {
    this.app = initializeApp(config);
    const ai = getAI(this.app, { backend: new GoogleAIBackend() });
    const cloudModel = config.cloudModel || 'gemini-3.5-flash-lite';

    // 1. Redactor: ONLY_ON_DEVICE, structured JSON output, NO cloud params (ADR-003, ADR-014)
    this.redactor = getGenerativeModel(ai, {
      mode: InferenceMode.ONLY_ON_DEVICE,
      onDeviceParams: {
        createOptions: {
          expectedInputs: [{ type: 'text', languages: ['en'] }],
          expectedOutputs: [{ type: 'text', languages: ['en'] }],
          initialPrompts: [
            {
              role: 'system',
              content: [{ type: 'text', value: REDACTOR_SYSTEM_PROMPT }],
            },
          ],
        },
        promptOptions: {
          responseConstraint: ENTITY_SCHEMA as unknown as object,
        },
      },
    });

    // 2. Hybrid Responder: PREFER_ON_DEVICE
    this.responderHybrid = getGenerativeModel(ai, {
      mode: InferenceMode.PREFER_ON_DEVICE,
      onDeviceParams: {
        createOptions: {
          initialPrompts: [
            {
              role: 'system',
              content: [{ type: 'text', value: RESPONDER_SYSTEM_PROMPT }],
            },
          ],
        },
      },
      inCloudParams: {
        model: cloudModel,
        generationConfig: {
          maxOutputTokens: 1024,
        },
      },
    });

    // 3. Cloud Responder: ONLY_IN_CLOUD (Requires user consent)
    this.responderCloud = getGenerativeModel(ai, {
      mode: InferenceMode.ONLY_IN_CLOUD,
      inCloudParams: {
        model: cloudModel,
        generationConfig: {
          maxOutputTokens: 1024,
        },
      },
    });
  }

  async checkAvailability(): Promise<AvailabilityState> {
    if (typeof window !== 'undefined' && 'LanguageModel' in window) {
      try {
        const lm = (window as unknown as { LanguageModel: { availability: () => Promise<string> } }).LanguageModel;
        const res = await lm.availability();
        if (res === 'readily' || res === 'available') return 'ready';
        if (res === 'after-download' || res === 'downloadable') return 'downloadable';
        if (res === 'downloading') return 'downloading';
        return 'unavailable';
      } catch {
        return 'unavailable';
      }
    }
    return 'unavailable';
  }

  async initializeDeviceModel(onProgress?: (percent: number) => void): Promise<void> {
    // initializeDeviceModel takes a callback receiving progress events
    if ('initializeDeviceModel' in this.redactor) {
      await (this.redactor as unknown as { initializeDeviceModel: (cb?: (e: { loaded: number; total: number }) => void) => Promise<void> }).initializeDeviceModel(
        (e) => {
          if (onProgress && e.total > 0) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        }
      );
    }
  }

  async redactOnDevice(
    chunk: string,
    timeoutMs: number = 20000
  ): Promise<{ entities: RawEntityCandidate[]; inferenceSource: 'ON_DEVICE' | 'IN_CLOUD' }> {
    const prompt = `<text>\n${chunk}\n</text>`;

    // Wrap with timeout promise
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Redaction timeout after ${timeoutMs}ms`)), timeoutMs)
    );

    const callPromise = this.redactor.generateContent(prompt);
    const result = await Promise.race([callPromise, timeoutPromise]);

    const inferenceSource = (result.response as unknown as { inferenceSource?: 'ON_DEVICE' | 'IN_CLOUD' })
      .inferenceSource || 'ON_DEVICE';

    const text = result.response.text();
    let parsed: { entities?: RawEntityCandidate[] } = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { entities: [] };
    }

    return {
      entities: parsed.entities || [],
      inferenceSource,
    };
  }

  async answer(
    sanitized: SanitizedText,
    route: 'ON_DEVICE' | 'IN_CLOUD',
    _modelName?: string
  ): Promise<{ text: string; inferenceSource: 'ON_DEVICE' | 'IN_CLOUD' }> {
    const model = route === 'ON_DEVICE' ? this.responderHybrid : this.responderCloud;
    const result = await model.generateContent(sanitized);

    const inferenceSource = (result.response as unknown as { inferenceSource?: 'ON_DEVICE' | 'IN_CLOUD' })
      .inferenceSource || (route === 'ON_DEVICE' ? 'ON_DEVICE' : 'IN_CLOUD');

    return {
      text: result.response.text(),
      inferenceSource,
    };
  }
}
