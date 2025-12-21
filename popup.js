// When popup loads, fetch the stored count
document.addEventListener("DOMContentLoaded", () => {
  console.log("[Popup] Popup opened. Fetching count from storage...");

  chrome.storage.local.get("count", (data) => {
    const count = data.count ?? 0;
    console.log("[Popup] Retrieved count from storage:", count);

    document.getElementById("count").innerText = count;
  });

  // Listen for count updates
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.count) {
      const newCount = changes.count.newValue ?? 0;
      console.log("[Popup] Count changed to:", newCount);
      document.getElementById("count").innerText = newCount;
    }
  });
});

// Handle reset button click - acts like user posted content
document.getElementById("reset").addEventListener("click", () => {
  console.log("[Popup] Reset button clicked");
  // Send reset message to background script (same as when user posts)
  chrome.runtime.sendMessage({ type: "resetCount" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("[Popup] Error resetting count:", chrome.runtime.lastError.message);
    } else {
      console.log("[Popup] Count reset successfully:", response);
      document.getElementById("count").innerText = 0;
    }
  });
});
