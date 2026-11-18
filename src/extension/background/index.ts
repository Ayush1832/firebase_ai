// Background Service Worker for Privacy Router
// Holds NO sensitive content. Routes messages and handles panel opening.
// Note: Prompt API is unavailable in workers per V-41; the AI engine runs in the side panel.

chrome.runtime.onInstalled.addListener(() => {
  // Configure side panel to open on action click if supported
  if (chrome.sidePanel && 'setPanelBehavior' in chrome.sidePanel) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
      // Ignore if not supported in current environment
    });
  }
});

// Guard message routing between content script and engine host
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'OPEN_PANEL' && sender.tab?.id) {
    if (chrome.sidePanel && 'open' in chrome.sidePanel) {
      chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => {
        // Fallback or ignore
      });
    }
    sendResponse({ ok: true });
    return true;
  }
  return false;
});
