const siteSelectors = {
  "youtube.com": "ytd-video-renderer, ytd-grid-video-renderer",
  "instagram.com": "article div._aagw",
  "linkedin.com": "div.feed-shared-update-v2, div.feed-shared-news-module",
  "quora.com": "div.q-box.qu-mb--tiny",
  "reddit.com": "div[data-testid='post-container']",
  "twitter.com": "article"
};

function getSelector() {
  const host = window.location.hostname;
  for (const domain in siteSelectors) {
    if (host.includes(domain)) {
      console.log("[Content Tracker] Using selector for:", domain);
      return siteSelectors[domain];
    }
  }
  console.log("[Content Tracker] No selector found for:", host);
  return null;
}

const selector = getSelector();

if (selector) {
  const seenPosts = new WeakSet();

  function checkNewPosts() {
    const posts = document.querySelectorAll(selector);
    console.log(`[Content Tracker] Found ${posts.length} total posts on screen.`);

    let newCount = 0;

    posts.forEach((post) => {
      if (!seenPosts.has(post)) {
        seenPosts.add(post);
        newCount++;
      }
    });

    if (newCount > 0) {
      console.log(`[Content Tracker] ${newCount} new posts detected. Sending message...`);
      chrome.runtime.sendMessage({ type: "increment", count: newCount });
    }
  }

  // Initial check
  console.log("[Content Tracker] Running initial post check...");
  checkNewPosts();

  // Observe DOM changes
  const observer = new MutationObserver(() => {
    console.log("[Content Tracker] DOM changed, re-checking posts...");
    checkNewPosts();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
