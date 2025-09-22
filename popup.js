// Handles UI for displaying and resetting the total count.


// When popup loads, fetch the stored total count
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get("totalCount", (data) => {
    document.getElementById("count").innerText = data.totalCount ?? 0;
  });
});

// Add Reset button functionality
document.getElementById("reset").addEventListener("click", () => {
  chrome.storage.local.set({ totalCount: 0 }, () => {
    document.getElementById("count").innerText = 0;
  });
});
