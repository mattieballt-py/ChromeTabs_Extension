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

// Handle reset button click
document.getElementById("reset").addEventListener("click", () => {
  console.log("[Popup] Reset button clicked. Resetting count to 0...");

  chrome.storage.local.set({ count: 0 }, () => {
    console.log("[Popup] count successfully reset in storage.");
    document.getElementById("count").innerText = 0;
  });
});
