// Open persistent floating window when extension icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.windows.create({
    url: chrome.runtime.getURL("panel.html"),
    type: "popup",
    width: 400,
    height: 600
  });
});

let totalCount = 0;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "increment") {
    chrome.storage.local.get(["count"], (result) => {
      const current = result.count || 0;
      const newCount = current + (message.count || 1);
      chrome.storage.local.set({ count: newCount }, () => {
        console.log(`[BG][DEBUG] Incremented count to ${newCount}`);
        if (sendResponse) sendResponse({ success: true, count: newCount });
      });
    });
    return true;
  }
  // Always call sendResponse for other messages too
  if (sendResponse) sendResponse({});
});
chrome.runtime.onInstalled.addListener(() => {
  totalCount = 0;
  chrome.storage.local.set({ count: 0 }, () => {
    console.log("[Background] Extension installed, counter reset.");
  });
});

// Handle reset messages from content script when user posts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "resetCount") {
    chrome.storage.local.set({ count: 0 }, () => {
      console.log("[BG][DEBUG] Count reset to 0 after user posted content");
      if (sendResponse) sendResponse({ success: true, count: 0 });
    });
    return true;
  }
});
