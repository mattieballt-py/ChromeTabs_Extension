// Map each site to the CSS selectors that represent "posts"
const siteSelectors = {
  "youtube.com": "ytd-video-renderer, ytd-grid-video-renderer",
  "instagram.com": "article div._aagw", // images/videos in feed
  "linkedin.com": "div.feed-shared-update-v2, div.feed-shared-news-module",
  "quora.com": "div.q-box.qu-mb--tiny",
  "reddit.com": "div[data-testid='post-container']",
  "twitter.com": "article" // tweets
};

// Decide which selector applies to the current site
function getSelector() {
  const host = window.location.hostname;
  for (const domain in siteSelectors) {
    if (host.includes(domain)) {
      return siteSelectors[domain];
    }
  }
  return null;
}

const selector = getSelector();
if (selector) {
  // Track IDs of posts we've already counted
  const seenPosts = new WeakSet();

  function checkNewPosts() {
    const posts = document.querySelectorAll(selector);
    let newCount = 0;

    posts.forEach((post) => {
      if (!seenPosts.has(post)) {
        seenPosts.add(post);
        newCount++;
      }
    });

    if (newCount > 0) {
      chrome.runtime.sendMessage({ type: "increment", count: newCount });
    }
  }

  // Run once on load
  checkNewPosts();

  // Observe DOM changes (for infinite scroll, dynamic loading)
  const observer = new MutationObserver(checkNewPosts);
  observer.observe(document.body, { childList: true, subtree: true });
}
