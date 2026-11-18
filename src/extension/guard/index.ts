// Guard Content Script (Phase 2 & 3)
// Scans prompts on supported third-party AI sites before submission.
// Never passes raw text to window.postMessage. Communicates only via chrome.runtime.

console.log('[Privacy Router Guard] Content script loaded on supported host.');
