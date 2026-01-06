// contentScript.js: Mask social media posts when threshold is reached and count posts viewed
console.log('[Masker][DEBUG] Content script loaded on:', window.location.hostname);

const MASK_CLASS = 'masked-post-cover';
const TOGGLE_ID = 'mask-toggle-btn';
let maskingEnabled = true;
let threshold = 10;
let debounceTimer = null;
// Use a Set to track unique post identifiers (id, data attribute, or hash)
let observedPostIds = new Set();
const seenPostIds = new Set();

// Site-specific selectors and unique ID extractors
const siteConfigs = [
  {
    domain: 'instagram.com',
    selector: 'main article, div[role="presentation"] > div > div > div > article', // Main feed posts - multiple selectors for Instagram's changing structure
    getId: post => {
      // Try multiple ways to find the post link
      // Method 1: Direct /p/ link (most common)
      let a = post.querySelector('a[href^="/p/"]');
      if (a && a.href) return 'ig:' + a.href;

      // Method 2: Look for /reel/ links (reels in feed)
      a = post.querySelector('a[href^="/reel/"]');
      if (a && a.href) return 'ig:' + a.href;

      // Method 3: Look deeper in nested structure
      a = post.querySelector('a[href*="/p/"]');
      if (a && a.href) return 'ig:' + a.href;

      a = post.querySelector('a[href*="/reel/"]');
      if (a && a.href) return 'ig:' + a.href;

      return null; // Don't count if no permalink found
    },
    fallbackSelector: null // No fallback, only main feed posts
  },
  {
    domain: 'reddit.com',
    selector: 'div[data-testid="post-container"]',
    getId: post => post.id || (post.querySelector('a[data-click-id="body"]')?.href ? 'rd:' + post.querySelector('a[data-click-id="body"]').href : null)
  },
  {
    domain: 'twitter.com',
    selector: 'article[role="article"]',
    getId: post => {
      const a = post.querySelector('a[href*="/status/"]');
      if (a && a.href) return 'tw:' + a.href;
      return null;
    }
  },
  {
    domain: 'x.com',
    selector: 'article[role="article"]',
    getId: post => {
      const a = post.querySelector('a[href*="/status/"]');
      if (a && a.href) return 'x:' + a.href;
      return null;
    }
  },
  {
    domain: 'linkedin.com',
    selector: 'div.feed-shared-update-v2',
    getId: post => post.getAttribute('data-urn') || null
  },
  {
    domain: 'youtube.com',
    selector: 'ytd-video-renderer, ytd-grid-video-renderer, ytd-reel-video-renderer, ytd-reel-item-renderer',
    getId: post => {
      // Method 1: Regular video title (for standard videos in list/grid view)
      let a = post.querySelector('a#video-title');
      if (a && a.href) return 'yt:' + a.href;

      // Method 2: Shorts - look for /shorts/ URL pattern
      a = post.querySelector('a[href*="/shorts/"]');
      if (a && a.href) return 'yt:' + a.href;

      // Method 3: Fallback - any video link with /watch
      a = post.querySelector('a[href*="/watch"]');
      if (a && a.href) return 'yt:' + a.href;

      // Method 4: Look for any anchor in the post as last resort
      a = post.querySelector('a[href^="/"]');
      if (a && a.href && (a.href.includes('/shorts/') || a.href.includes('/watch'))) {
        return 'yt:' + a.href;
      }

      return null;
    }
  },
  {
    domain: 'quora.com',
    selector: 'div.q-box.qu-mb--tiny',
    getId: post => post.getAttribute('data-id') || null
  }
];

function getSiteConfig() {
  const host = window.location.hostname;
  for (const config of siteConfigs) {
    if (host.includes(config.domain)) return config;
  }
  return null;
}

// Check if extension context is still valid
function isExtensionContextValid() {
  try {
    return chrome.runtime && chrome.runtime.id;
  } catch (e) {
    return false;
  }
}

// Initialize IntersectionObserver for accurate view detection
function initializeIntersectionObserver() {
  if (!window._maskerIntersectionObserver) {
    const config = getSiteConfig();
    window._maskerIntersectionObserver = new IntersectionObserver((entries) => {
      let newCount = 0;
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          let post = entry.target;

          // Don't count posts if they're masked (threshold reached)
          if (maskingEnabled && post.classList.contains(MASK_CLASS)) {
            console.log('[Masker][DEBUG] Skipping masked post (threshold reached)');
            return;
          }

          let postId = null;
          try {
            if (config) {
              postId = config.getId(post);
            }
          } catch (e) {
            console.warn('[Masker][DEBUG] getId threw error:', e);
          }
          if (!postId && post.dataset && post.dataset.postId) {
            postId = 'data-post-id:' + post.dataset.postId;
          }
          if (!postId) {
            let text = post.innerText || post.textContent || '';
            let hash = 0;
            for (let i = 0; i < text.length; i++) {
              hash = ((hash << 5) - hash) + text.charCodeAt(i);
              hash |= 0;
            }
            postId = 'hash:' + hash;
          }
          if (!seenPostIds.has(postId)) {
            seenPostIds.add(postId);
            newCount++;
            console.log(`[Masker][DEBUG] New post viewed: ${postId}`);
          }
        }
      });
      if (newCount > 0) {
        console.log(`[Masker][DEBUG] Detected ${newCount} newly viewed posts. Sending increment.`);

        // Check if extension context is still valid before sending message
        if (!isExtensionContextValid()) {
          console.warn('[Masker][DEBUG] Extension context invalidated. Please reload the page.');
          return;
        }

        try {
          chrome.runtime.sendMessage({ type: "increment", count: newCount }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('[Masker][DEBUG] Error sending message:', chrome.runtime.lastError.message);
              // If context is invalidated, stop trying to send messages
              if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
                console.warn('[Masker][DEBUG] Extension was reloaded. Please refresh this page.');
              }
            } else {
              console.log('[Masker][DEBUG] Message sent successfully. Response:', response);
            }
          });
        } catch (e) {
          console.error('[Masker][DEBUG] Exception sending message:', e);
          if (e.message.includes('Extension context invalidated')) {
            console.warn('[Masker][DEBUG] Extension was reloaded. Please refresh this page.');
          }
        }
      }
    }, { threshold: 0.5 }); // 50% of post must be visible
  }
}

function getPostIdentifier(post) {
  // Try id, data-post-id, or fallback to text hash
  if (post.id) return 'id:' + post.id;
  if (post.dataset && post.dataset.postId) return 'data-post-id:' + post.dataset.postId;
  // Fallback: hash of innerText (not perfect, but better than nothing)
  let text = post.innerText || post.textContent || '';
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return 'hash:' + hash;
}

function maskAndCountPosts() {
  const config = getSiteConfig();
  if (!config) {
    console.log('[Masker][DEBUG] No site config for this site.');
    return;
  }
  let posts = document.querySelectorAll(config.selector);
  let selectorUsed = config.selector;
  console.log(`[Masker][DEBUG] Using selector: ${selectorUsed}`);
  console.log(`[Masker][DEBUG] Found ${posts.length} articles initially`);

  // For Instagram, only mask/count main feed posts with a real permalink
  if (config.domain === 'instagram.com') {
    console.log('[Masker][DEBUG] Instagram detected, filtering posts...');
    const allPosts = Array.from(posts);
    console.log(`[Masker][DEBUG] Total articles found: ${allPosts.length}`);

    // Log first few posts for debugging
    allPosts.slice(0, 3).forEach((post, index) => {
      const id = config.getId(post);
      console.log(`[Masker][DEBUG] Article ${index + 1} ID:`, id);
      const link = post.querySelector('a[href^="/p/"]');
      console.log(`[Masker][DEBUG] Article ${index + 1} has /p/ link:`, !!link, link?.href);
    });

    posts = allPosts.filter(post => !!config.getId(post));
    selectorUsed = config.selector + ' (filtered for real posts)';
    console.log(`[Masker][DEBUG] After filtering: ${posts.length} valid posts`);
  }
  console.log(`[Masker][DEBUG] Final count: ${posts.length} main feed posts on screen.`);

  // Check actual viewed count from storage to decide masking
  chrome.storage.local.get(['count'], (result) => {
    const viewedCount = result.count || 0;
    console.log(`[Masker][DEBUG] Current viewed count: ${viewedCount}, threshold: ${threshold}`);

    // Masking logic: mask if threshold reached
    if (maskingEnabled && viewedCount >= threshold) {
      console.log('[Masker][DEBUG] Threshold reached, masking all posts');
      posts.forEach(post => {
        if (!post.classList.contains(MASK_CLASS)) {
          post.classList.add(MASK_CLASS);
          console.log('[Masker][DEBUG] Masked post:', config.getId(post));
        }
      });
    } else {
      posts.forEach(post => {
        if (post.classList.contains(MASK_CLASS)) {
          post.classList.remove(MASK_CLASS);
          console.log('[Masker][DEBUG] Unmasked post:', config.getId(post));
        }
      });
    }
  });
  // Ensure IntersectionObserver is initialized before observing posts
  if (!window._maskerIntersectionObserver) {
    console.warn('[Masker][DEBUG] IntersectionObserver not initialized, initializing now...');
    initializeIntersectionObserver();
  }

  // Counting logic: only observe real posts
  console.log(`[Masker][DEBUG] Starting to observe ${posts.length} posts...`);
  let observedCount = 0;
  posts.forEach((post, index) => {
    let postId = null;
    try {
      postId = config.getId(post);
    } catch (e) {
      console.warn(`[Masker][DEBUG] Error getting ID for post ${index}:`, e);
    }
    if (!postId) {
      console.log(`[Masker][DEBUG] Post ${index} has no ID, skipping`);
      return; // Only observe real posts
    }
    if (!observedPostIds.has(postId)) {
      if (window._maskerIntersectionObserver) {
        console.log(`[Masker][DEBUG] Observing post ${index} with ID: ${postId}`);
        window._maskerIntersectionObserver.observe(post);
        observedPostIds.add(postId);
        observedCount++;
      } else {
        console.error('[Masker][DEBUG] Failed to initialize IntersectionObserver');
      }
    } else {
      console.log(`[Masker][DEBUG] Post ${index} already observed: ${postId}`);
    }
  });
  console.log(`[Masker][DEBUG] Now observing ${observedCount} new posts (total tracked: ${observedPostIds.size})`);
}

function debounceMaskAndCountPosts() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(maskAndCountPosts, 200);
}

function injectToggleButton() {
  if (document.getElementById(TOGGLE_ID)) return;
  const btn = document.createElement('button');
  btn.id = TOGGLE_ID;
  btn.textContent = 'Toggle Masking';
  btn.style.position = 'fixed';
  btn.style.bottom = '20px';
  btn.style.right = '20px';
  btn.style.zIndex = '10001';
  btn.style.padding = '8px 16px';
  btn.style.background = '#222';
  btn.style.color = '#fff';
  btn.style.border = 'none';
  btn.style.borderRadius = '6px';
  btn.style.cursor = 'pointer';
  btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  btn.onclick = () => {
    maskingEnabled = !maskingEnabled;
    btn.textContent = maskingEnabled ? 'Disable Masking' : 'Enable Masking';
    maskAndCountPosts();
  };
  document.body.appendChild(btn);
}

// Site-specific post detection selectors
const postDetectionConfigs = {
  'instagram.com': {
    // Detect "Share" button click in post creation modal
    buttonSelectors: ['button[type="button"]'],
    buttonTextMatch: /share|post/i,
    // Alternative: detect when modal closes after posting
    modalSelector: 'div[role="dialog"]'
  },
  'reddit.com': {
    // Detect both post submissions and question posts
    buttonSelectors: ['button[type="submit"]', 'button:not([type])'],
    buttonTextMatch: /post|submit|save/i
  },
  'twitter.com': {
    buttonSelectors: ['div[data-testid="tweetButtonInline"]', 'button[data-testid="tweetButton"]'],
    buttonTextMatch: /post|tweet/i
  },
  'x.com': {
    buttonSelectors: ['div[data-testid="tweetButtonInline"]', 'button[data-testid="tweetButton"]'],
    buttonTextMatch: /post|tweet/i
  },
  'linkedin.com': {
    buttonSelectors: ['button.share-actions__primary-action'],
    buttonTextMatch: /post/i
  },
  'youtube.com': {
    buttonSelectors: ['ytd-button-renderer#submit-button'],
    buttonTextMatch: /comment/i
  },
  'quora.com': {
    // Detect both answer posting and question asking
    buttonSelectors: ['button[type="submit"]', 'button:not([type])', 'div[role="button"]'],
    buttonTextMatch: /add answer|post|add question|ask question|submit/i
  }
};

// Detect when user posts content
function setupPostDetection() {
  const host = window.location.hostname;
  let config = null;

  for (const domain in postDetectionConfigs) {
    if (host.includes(domain)) {
      config = postDetectionConfigs[domain];
      break;
    }
  }

  if (!config) {
    console.log('[Masker][DEBUG] No post detection config for this site.');
    return;
  }

  console.log('[Masker][DEBUG] Setting up post detection for', host);

  // Use event delegation to catch dynamically added buttons
  document.addEventListener('click', (event) => {
    const target = event.target;

    // Check if clicked element or its parents match post button selectors
    config.buttonSelectors.forEach(selector => {
      const button = target.closest(selector);
      if (button) {
        const buttonText = button.innerText || button.textContent || '';
        if (config.buttonTextMatch.test(buttonText)) {
          console.log('[Masker][DEBUG] Post button clicked! Resetting count...');
          // Reset count after a short delay to ensure post was successful
          setTimeout(() => {
            // Check if extension context is still valid
            if (!isExtensionContextValid()) {
              console.warn('[Masker][DEBUG] Extension context invalidated. Cannot reset count.');
              return;
            }

            try {
              chrome.runtime.sendMessage({ type: "resetCount" }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error('[Masker][DEBUG] Error resetting count:', chrome.runtime.lastError.message);
                } else {
                  console.log('[Masker][DEBUG] Count reset successfully:', response);
                  // Clear the seen posts to start fresh
                  seenPostIds.clear();
                  observedPostIds.clear();
                  // Remove masking
                  const posts = document.querySelectorAll(`.${MASK_CLASS}`);
                  posts.forEach(post => post.classList.remove(MASK_CLASS));
                }
              });
            } catch (e) {
              console.error('[Masker][DEBUG] Exception resetting count:', e);
            }
          }, 1000);
        }
      }
    });
  }, true); // Use capture phase to catch events early
}

// Show celebration animation when content is created
function showCelebrationAnimation() {
  // Create animation overlay
  const overlay = document.createElement('div');
  overlay.id = 'content-tracker-celebration';
  overlay.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 999999;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 40px 60px;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    text-align: center;
    animation: slideIn 0.5s ease-out, fadeOut 0.5s ease-in 2.5s;
    pointer-events: none;
  `;

  overlay.innerHTML = `
    <div style="font-size: 60px; margin-bottom: 15px; animation: bounce 0.6s ease-in-out infinite alternate;">
      🎉
    </div>
    <div style="color: white; font-size: 24px; font-weight: bold; font-family: 'Segoe UI', sans-serif; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">
      Content Created!
    </div>
    <div style="color: rgba(255,255,255,0.9); font-size: 16px; margin-top: 10px; font-family: 'Segoe UI', sans-serif;">
      Counter reset to 0
    </div>
  `;

  // Add CSS animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translate(-50%, -60%);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%);
      }
    }
    @keyframes fadeOut {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }
    @keyframes bounce {
      from {
        transform: translateY(0px);
      }
      to {
        transform: translateY(-10px);
      }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(overlay);

  // Remove after animation completes
  setTimeout(() => {
    overlay.remove();
    style.remove();
  }, 3000);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "unmaskPosts") {
    console.log('[Masker][DEBUG] Received unmask message. Clearing masks and resetting count.');

    // Show animation if requested
    if (message.showAnimation) {
      showCelebrationAnimation();
    }

    // Clear the seen posts to start fresh
    seenPostIds.clear();
    observedPostIds.clear();
    // Remove all masking
    const posts = document.querySelectorAll(`.${MASK_CLASS}`);
    posts.forEach(post => post.classList.remove(MASK_CLASS));
    console.log(`[Masker][DEBUG] Unmasked ${posts.length} posts`);
    if (sendResponse) sendResponse({ success: true });
    return true;
  }
});

// Main initialization function
function initialize() {
  console.log('[Masker][DEBUG] Initializing content script...');

  if (!document.body) {
    console.log('[Masker][DEBUG] document.body not ready, waiting...');
    setTimeout(initialize, 100);
    return;
  }

  console.log('[Masker][DEBUG] document.body ready, starting initialization');

  // Initialize IntersectionObserver
  initializeIntersectionObserver();
  console.log('[Masker][DEBUG] IntersectionObserver initialized');

  // Load threshold from storage
  chrome.storage.sync.get({ maskThreshold: 10 }, (data) => {
    threshold = data.maskThreshold;
    console.log('[Masker][DEBUG] Loaded threshold from storage:', threshold);
    maskAndCountPosts();
    setupPostDetection();
  });

  // Observe DOM changes for dynamic content (Instagram is an SPA)
  const observer = new MutationObserver(debounceMaskAndCountPosts);
  observer.observe(document.body, { childList: true, subtree: true });
  console.log('[Masker][DEBUG] MutationObserver started');

  // Inject toggle button
  injectToggleButton();
  console.log('[Masker][DEBUG] Toggle button injected');
}

// Start initialization
if (document.readyState === 'loading') {
  console.log('[Masker][DEBUG] Document still loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  console.log('[Masker][DEBUG] Document already loaded, initializing now');
  initialize();
}
