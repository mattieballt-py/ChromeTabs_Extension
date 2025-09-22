
let totalCount = 0;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("[Background] Message received:", msg);

  if (msg.type === "increment") {
    totalCount += msg.count;
    console.log(`[Background] Incremented by ${msg.count}. New total: ${totalCount}`);

    chrome.storage.local.set({ totalCount }, () => {
      console.log("[Background] Saved totalCount to storage:", totalCount);
    });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  totalCount = 0;
  chrome.storage.local.set({ totalCount: 0 }, () => {
    console.log("[Background] Extension installed, counter reset.");
  });
});
