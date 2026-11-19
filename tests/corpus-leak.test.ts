import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { runPrivacyPipeline } from '../src/ai/pipeline';
import { FakeAiPort } from '../src/ai/fake';
import { Vault } from '../src/core/vault';
import { GLOBAL_PACK } from '../src/core/packs/global';
import { US_PACK } from '../src/core/packs/us';
import { IN_PACK } from '../src/core/packs/in';
import { asRawText } from '../src/shared/types';
import { requestAnswer } from '../src/ai/wrapper';

interface CorpusItem {
  id: string;
  text: string;
  entities: { type: string; text: string }[];
  tags: string[];
  split: 'dev' | 'held-out';
}

const ALL_DETECTORS = [...GLOBAL_PACK, ...US_PACK, ...IN_PACK];

describe('T-4.1 & L-1: Full Corpus Privacy Leak Verification (100 Samples)', () => {
  it('asserts zero raw personal data leaks into outbound cloud requests across all samples', async () => {
    const corpusPath = path.resolve(__dirname, '../fixtures/corpus.jsonl');
    const lines = fs.readFileSync(corpusPath, 'utf8').trim().split('\n');
    const corpus: CorpusItem[] = lines.map((l) => JSON.parse(l));

    expect(corpus.length).toBe(100);

    let totalSamplesChecked = 0;
    let totalLeaksDetected = 0;
    const leakedItems: { sampleId: string; leakedValue: string }[] = [];

    for (const item of corpus) {
      totalSamplesChecked++;
      const vault = new Vault();

      // Configure fake AI to simulate on-device Gemini Nano entity extraction for free-text names
      const simulatedEntities = item.entities.map((e) => ({
        text: e.text,
        type: e.type,
      }));

      const fake = new FakeAiPort({
        availability: 'ready',
        simulatedEntities,
      });

      const res = await runPrivacyPipeline(asRawText(item.text), {
        detectors: ALL_DETECTORS,
        aiPort: fake,
        vault,
      });

      // The safety gate must pass or block cleanly
      if (res.gateResult.status === 'passed' && res.sanitizedText) {
        // Dispatch to outbound model
        await requestAnswer(res.sanitizedText, 'IN_CLOUD', fake);

        // Inspect every outbound request body under the network spy
        for (const req of fake.outboundRequests) {
          const sentPrompt = req.prompt;

          for (const ent of item.entities) {
            const rawVal = ent.text.trim();
            // Check entities with length >= 4 to avoid false substring positives
            if (rawVal.length >= 4 && sentPrompt.includes(rawVal)) {
              totalLeaksDetected++;
              leakedItems.push({ sampleId: item.id, leakedValue: rawVal });
            }
          }
        }
      }
    }

    // Hard Invariant L-1: Zero leaks across all 100 samples!
    expect(totalSamplesChecked).toBe(100);
    expect(leakedItems).toEqual([]);
    expect(totalLeaksDetected).toBe(0);
  });
});
