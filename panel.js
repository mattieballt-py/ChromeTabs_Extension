// When panel loads, fetch the stored count
window.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get("count", (data) => {
    const count = data.count ?? 0;
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

  // Handle reset button click
  document.getElementById("reset").addEventListener("click", () => {
    chrome.storage.local.set({ count: 0 }, () => {
      document.getElementById("count").innerText = 0;
    });
  });
});
