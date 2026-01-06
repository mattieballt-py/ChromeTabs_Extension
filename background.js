// Open persistent floating window when extension icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.windows.create({
    url: chrome.runtime.getURL("panel.html"),
    type: "popup",
    width: 400,
    height: 600
  });
});

// Helper function to get today's date string (YYYY-MM-DD)
function getTodayDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Initialize daily data tracking
function initializeDailyData() {
  const today = getTodayDateString();
  chrome.storage.local.get(['dailyData', 'lastActiveDate'], (result) => {
    let dailyData = result.dailyData || {};
    const lastActiveDate = result.lastActiveDate || today;

    // If it's a new day, save yesterday's data and reset count
    if (lastActiveDate !== today) {
      console.log(`[BG] New day detected. Last active: ${lastActiveDate}, Today: ${today}`);
      chrome.storage.local.get(['count'], (countResult) => {
        const yesterdayCount = countResult.count || 0;
        // Save yesterday's final count
        if (yesterdayCount > 0) {
          dailyData[lastActiveDate] = yesterdayCount;
        }
        // Reset count for new day
        chrome.storage.local.set({
          count: 0,
          dailyData: dailyData,
          lastActiveDate: today
        }, () => {
          console.log(`[BG] Reset for new day. Yesterday (${lastActiveDate}): ${yesterdayCount} posts`);
        });
      });
    } else {
      // Same day, just ensure lastActiveDate is set
      chrome.storage.local.set({ lastActiveDate: today });
    }
  });
}

// Consolidated message listener
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "increment") {
    chrome.storage.local.get(["count", "dailyData", "lastActiveDate"], (result) => {
      const current = result.count || 0;
      const newCount = current + (message.count || 1);
      const today = getTodayDateString();

      chrome.storage.local.set({ count: newCount, lastActiveDate: today }, () => {
        console.log(`[BG][DEBUG] Incremented count to ${newCount}`);
        if (sendResponse) sendResponse({ success: true, count: newCount });
      });
    });
    return true;
  }

  if (message.type === "resetCount") {
    const today = getTodayDateString();
    chrome.storage.local.get(['dailyData'], (result) => {
      let dailyData = result.dailyData || {};

      // Record content creation event
      if (!dailyData[today]) {
        dailyData[today] = { consumed: 0, created: 0 };
      }
      if (typeof dailyData[today] === 'number') {
        // Convert old format to new format
        dailyData[today] = { consumed: dailyData[today], created: 0 };
      }
      dailyData[today].created = (dailyData[today].created || 0) + 1;

      chrome.storage.local.set({ count: 0, dailyData, lastActiveDate: today }, () => {
        console.log("[BG][DEBUG] Count reset to 0 after user posted content");
        // Notify all tabs to unmask posts and show animation
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { type: "unmaskPosts", showAnimation: true }).catch(() => {
              // Ignore errors for tabs that don't have content script
            });
          });
        });
        if (sendResponse) sendResponse({ success: true, count: 0 });
      });
    });
    return true;
  }

  if (message.type === "getStats") {
    chrome.storage.local.get(['count', 'dailyData', 'lastActiveDate'], (result) => {
      const dailyData = result.dailyData || {};
      const count = result.count || 0;
      const today = getTodayDateString();

      if (sendResponse) {
        sendResponse({
          success: true,
          currentCount: count,
          dailyData: dailyData,
          today: today
        });
      }
    });
    return true;
  }

  // Always call sendResponse for other messages too
  if (sendResponse) sendResponse({});
  return false;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['count', 'dailyData'], (result) => {
    const initialData = {
      count: result.count || 0,
      dailyData: result.dailyData || {},
      lastActiveDate: getTodayDateString()
    };
    chrome.storage.local.set(initialData, () => {
      console.log("[Background] Extension installed/updated, data initialized.");
    });
  });
});

// Check for new day on startup
chrome.runtime.onStartup.addListener(() => {
  initializeDailyData();
});

// Periodically check for new day (every hour)
setInterval(() => {
  initializeDailyData();
}, 60 * 60 * 1000);
