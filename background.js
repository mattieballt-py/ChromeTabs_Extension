// Keeps a running total of all posts seen across sites.
// Persists the count in chrome.storage.local.


// Initialize counter
let totalCount = 0;

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "increment") {
    // Add the number of new posts detected
    totalCount += msg.count;

    // Save updated total to storage
    chrome.storage.local.set({ totalCount });
  }
});

// Reset counter when extension is first installed
chrome.runtime.onInstalled.addListener(() => {
  totalCount = 0;
  chrome.storage.local.set({ totalCount: 0 });
});
