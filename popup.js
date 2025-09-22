// When popup loads, fetch the stored total count
document.addEventListener("DOMContentLoaded", () => {
  console.log("[Popup] Popup opened. Fetching totalCount from storage...");

  chrome.storage.local.get("totalCount", (data) => {
    const count = data.totalCount ?? 0;
    console.log("[Popup] Retrieved totalCount from storage:", count);

    document.getElementById("count").innerText = count;
  });
});

// Handle reset button click
document.getElementById("reset").addEventListener("click", () => {
  console.log("[Popup] Reset button clicked. Resetting count to 0...");

  chrome.storage.local.set({ totalCount: 0 }, () => {
    console.log("[Popup] totalCount successfully reset in storage.");
    document.getElementById("count").innerText = 0;
  });
});
