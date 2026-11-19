import { describe, it, expect } from 'vitest';
import { redactChunkOnDevice, requestAnswer } from '../src/ai/wrapper';
import { FakeAiPort } from '../src/ai/fake';
import { brandSanitizedText } from '../src/shared/types';

describe('T-2.1: AI Logic Wrapper & Invariant I-5', () => {
  it('extracts verbatim substrings and maps them to chunk offsets', async () => {
    const chunk = 'Hi, I am Priya Sharma and my employer is Acme Corp.';
    const fake = new FakeAiPort({
      simulatedEntities: [
        { text: 'Priya Sharma', type: 'PERSON' },
        { text: 'Acme Corp', type: 'ORG' },
      ],
      redactorInferenceSource: 'ON_DEVICE',
    });

    const res = await redactChunkOnDevice(chunk, fake);
    expect(res.degraded).toBe(false);
    expect(res.inferenceSource).toBe('ON_DEVICE');
    expect(res.spans.length).toBe(2);

    expect(res.spans[0].type).toBe('PERSON');
    expect(res.spans[0].originalText).toBe('Priya Sharma');
    expect(chunk.slice(res.spans[0].start, res.spans[0].end)).toBe('Priya Sharma');

    expect(res.spans[1].type).toBe('ORG');
    expect(res.spans[1].originalText).toBe('Acme Corp');
    expect(chunk.slice(res.spans[1].start, res.spans[1].end)).toBe('Acme Corp');
  });

  it('discards hallucinated substrings not present verbatim in chunk', async () => {
    const chunk = 'A completely unrelated financial note.';
    const fake = new FakeAiPort({
      simulatedEntities: [{ text: 'NonExistent Person', type: 'PERSON' }],
    });

    const res = await redactChunkOnDevice(chunk, fake);
    expect(res.spans.length).toBe(0);
  });

  it('discards placeholder lookalikes returned as entities', async () => {
    const chunk = 'User said [PERSON_1] was involved.';
    const fake = new FakeAiPort({
      simulatedEntities: [{ text: '[PERSON_1]', type: 'PERSON' }],
    });

    const res = await redactChunkOnDevice(chunk, fake);
    expect(res.spans.length).toBe(0);
  });

  it('maps OTHER_ID to GOV_ID with low confidence', async () => {
    const chunk = 'ID token: ABC123XYZ';
    const fake = new FakeAiPort({
      simulatedEntities: [{ text: 'ABC123XYZ', type: 'OTHER_ID' }],
    });

    const res = await redactChunkOnDevice(chunk, fake);
    expect(res.spans.length).toBe(1);
    expect(res.spans[0].type).toBe('GOV_ID');
    expect(res.spans[0].confidence).toBe('low');
  });

  it('Invariant I-5 Assertion: rejects any redactor response reporting inferenceSource IN_CLOUD', async () => {
    const chunk = 'Secret text';
    const fake = new FakeAiPort({
      simulatedEntities: [{ text: 'Secret', type: 'PERSON' }],
      redactorInferenceSource: 'IN_CLOUD', // Violation!
    });

    const res = await redactChunkOnDevice(chunk, fake);
    // Must degrade to 0 spans rather than accepting a cloud redaction
    expect(res.degraded).toBe(true);
    expect(res.spans.length).toBe(0);
  });

  it('handles timeouts gracefully by degrading the chunk', async () => {
    const chunk = 'Slow processing chunk';
    const fake = new FakeAiPort({ timeoutOnRedact: true });

    const res = await redactChunkOnDevice(chunk, fake, 20);
    expect(res.degraded).toBe(true);
    expect(res.spans.length).toBe(0);
  });

  it('answers requests with branded SanitizedText and records inferenceSource and latency', async () => {
    const fake = new FakeAiPort();
    const sanitized = brandSanitizedText('Question with [CARD_1]');

    const res = await requestAnswer(sanitized, 'ON_DEVICE', fake);
    expect(res.inferenceSource).toBe('ON_DEVICE');
    expect(res.text).toContain('[CARD_1]');
    expect(res.ms).toBeGreaterThanOrEqual(0);
    expect(fake.outboundRequests.length).toBe(1);
  });
});
