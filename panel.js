// When panel loads, fetch the stored count
window.addEventListener("DOMContentLoaded", () => {
  console.log("[Panel] Panel loaded, fetching count from storage...");

  chrome.storage.local.get("count", (data) => {
    const count = data.count ?? 0;
    console.log("[Panel] Retrieved count from storage:", count);
    document.getElementById("count").innerText = count;
  });

  // Listen for count updates
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.count) {
      const newCount = changes.count.newValue ?? 0;
      console.log("[Panel] Count changed to:", newCount);
      document.getElementById("count").innerText = newCount;
    }
  });

  // Handle reset button click - acts like user posted content
  document.getElementById("reset").addEventListener("click", () => {
    console.log("[Panel] Reset button clicked");
    // Send reset message to background script (same as when user posts)
    chrome.runtime.sendMessage({ type: "resetCount" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("[Panel] Error resetting count:", chrome.runtime.lastError.message);
      } else {
        console.log("[Panel] Count reset successfully:", response);
        document.getElementById("count").innerText = 0;
      }
    });
  });
});
