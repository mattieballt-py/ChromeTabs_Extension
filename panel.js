// When panel loads, fetch the stored total count
window.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get("totalCount", (data) => {
    const count = data.totalCount ?? 0;
    document.getElementById("count").innerText = count;
  });
});

// Handle reset button click
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("reset").addEventListener("click", () => {
    chrome.storage.local.set({ totalCount: 0 }, () => {
      document.getElementById("count").innerText = 0;
    });
  });
});
