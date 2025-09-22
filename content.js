// Tracks total content viewed:
// 1. Feed posts (Reddit, X/Twitter, LinkedIn, Quora, Instagram)
// 2. Videos (YouTube, Instagram, etc.)
// Each new post or video counts as +1

// --- 1. SITE SELECTORS ---

// CSS selectors for posts/content for each site
const siteSelectors = {
  "youtube.com": "ytd-video-renderer, ytd-grid-video-renderer",
  "instagram.com": "article div._aagw",
  "linkedin.com": "div.feed-shared-update-v2, div.feed-shared-news-module",
  "quora.com": "div.q-box.qu-mb--tiny",
  "reddit.com": "div[data-testid='post-container']",
  "x.com": "article" // formerly twitter.com
};

// Determine which selector applies to the current site
function getSiteSelector() {
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

// Track feed posts already counted
const seenPosts = new WeakSet();

// --- 2. FUNCTION: COUNT NEW FEED POSTS ---
function checkNewPosts() {
  const selector = getSiteSelector();
  if (!selector) return;

  const posts = document.querySelectorAll(selector);
  let newCount = 0;

  posts.forEach((post) => {
    if (!seenPosts.has(post)) {
      seenPosts.add(post);
      newCount++;
    }
  });

  if (newCount > 0) {
    console.log(`[Content Tracker] ${newCount} new feed posts detected. Incrementing counter.`);
    chrome.runtime.sendMessage({ type: "increment", count: newCount });
  }
}

// Initial feed check
checkNewPosts();

// Watch for dynamically loaded posts (infinite scroll, lazy loading)
const postObserver = new MutationObserver(checkNewPosts);
postObserver.observe(document.body, { childList: true, subtree: true });

// --- 3. FUNCTION: TRACK VIDEO CONTENT ---

function trackVideos() {
  const videos = document.querySelectorAll("video");

  videos.forEach((video) => {
    // Only attach listeners once
    if (video.dataset.trackerAttached) return;
    video.dataset.trackerAttached = "true";

    // --- A. Count on user play ---
    video.addEventListener("play", () => {
      console.log("[Content Tracker] Video played, incrementing counter by 1.");
      chrome.runtime.sendMessage({ type: "increment", count: 1 });
    });

    // --- B. Count on visibility (for autoplay videos) ---
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          console.log("[Content Tracker] Video became visible, incrementing counter by 1.");
          chrome.runtime.sendMessage({ type: "increment", count: 1 });
          observer.unobserve(entry.target); // count only once
        }
      });
    }, { threshold: 0.5 }); // 50% visible

    observer.observe(video);
  });
}

// Initial video check
trackVideos();

// Watch for dynamically added videos
const videoObserver = new MutationObserver(trackVideos);
videoObserver.observe(document.body, { childList: true, subtree: true });
