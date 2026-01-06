// Helper function to format date
function formatDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateString === today.toISOString().split('T')[0]) {
    return 'Today';
  } else if (dateString === yesterday.toISOString().split('T')[0]) {
    return 'Yesterday';
  } else {
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }
}

// Render statistics
function renderStats() {
  chrome.runtime.sendMessage({ type: "getStats" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("[Popup] Error getting stats:", chrome.runtime.lastError.message);
      return;
    }

    if (!response || !response.success) {
      console.error("[Popup] Failed to get stats");
      return;
    }

    const { currentCount, dailyData, today } = response;
    document.getElementById("count").innerText = currentCount;

    // Get last 7 days including today
    const statsContainer = document.getElementById("statsContainer");
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    // Build stats HTML
    let statsHTML = '';
    let hasData = false;

    dates.forEach(date => {
      const data = dailyData[date];
      if (data || date === today) {
        hasData = true;
        let consumed = 0;
        let created = 0;

        if (date === today) {
          consumed = currentCount;
        } else if (data) {
          if (typeof data === 'number') {
            consumed = data;
          } else {
            consumed = data.consumed || 0;
            created = data.created || 0;
          }
        }

        const isToday = date === today;
        const dateLabel = formatDate(date) + (isToday ? '<span class="today-badge">NOW</span>' : '');

        statsHTML += `
          <div class="stat-item">
            <span class="stat-date">${dateLabel}</span>
            <span>
              <span class="stat-value">${consumed}</span>
              ${created > 0 ? `<span class="stat-created">+${created} created</span>` : ''}
            </span>
          </div>
        `;
      }
    });

    if (!hasData) {
      statsHTML = '<div class="no-data">No data yet. Start browsing!</div>';
    }

    statsContainer.innerHTML = statsHTML;
  });
}

// When popup loads, fetch the stored count and stats
document.addEventListener("DOMContentLoaded", () => {
  console.log("[Popup] Popup opened. Fetching data...");
  renderStats();

  // Listen for count updates
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local") {
      if (changes.count || changes.dailyData) {
        console.log("[Popup] Data changed, refreshing stats");
        renderStats();
      }
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
      renderStats(); // Refresh to show updated created count
    }
  });
});
