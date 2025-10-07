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
