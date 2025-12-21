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

// Consolidated message listener
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
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

  if (message.type === "resetCount") {
    chrome.storage.local.set({ count: 0 }, () => {
      console.log("[BG][DEBUG] Count reset to 0 after user posted content");
      // Notify all tabs to unmask posts
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { type: "unmaskPosts" }).catch(() => {
            // Ignore errors for tabs that don't have content script
          });
        });
      });
      if (sendResponse) sendResponse({ success: true, count: 0 });
    });
    return true;
  }

  // Always call sendResponse for other messages too
  if (sendResponse) sendResponse({});
  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  totalCount = 0;
  chrome.storage.local.set({ count: 0 }, () => {
    console.log("[Background] Extension installed, counter reset.");
  });
});
