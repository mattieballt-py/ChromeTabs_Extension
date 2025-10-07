// contentScript.js: Mask social media posts when threshold is reached and count posts viewed
const MASK_CLASS = 'masked-post-cover';
const TOGGLE_ID = 'mask-toggle-btn';
let maskingEnabled = true;
let threshold = 10;
let debounceTimer = null;
// Use a Set to track unique post identifiers (id, data attribute, or hash)
let seenPostIds = new Set();
let observedPostIds = new Set();
const seenPostIds = new Set();

// Site-specific selectors and unique ID extractors
const siteConfigs = [
  {
    domain: 'instagram.com',
    selector: 'main article', // Only main feed posts
    getId: post => {
      // Only count if it's a real post (has a permalink)
      const a = post.querySelector('a[href^="/p/"]');
      if (a && a.href) return 'ig:' + a.href;
      return null; // Don't count if no permalink
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

  // IntersectionObserver for accurate view detection
  if (!window._maskerIntersectionObserver) {
    window._maskerIntersectionObserver = new IntersectionObserver((entries) => {
      let newCount = 0;
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          let post = entry.target;
          let postId = null;
          try {
            postId = config.getId(post);
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
          if (!seenPostIds.has(postId) && !observedPostIds.has(postId)) {
            seenPostIds.add(postId);
            observedPostIds.add(postId);
            newCount++;
            console.log(`[Masker][DEBUG] New post viewed: ${postId}`);
          }
        }
      });
      if (newCount > 0) {
        console.log(`[Masker][DEBUG] Detected ${newCount} newly viewed posts. Sending increment.`);
        try {
          chrome.runtime.sendMessage({ type: "increment", count: newCount }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('[Masker][DEBUG] Error sending message:', chrome.runtime.lastError.message);
            } else {
              console.log('[Masker][DEBUG] Message sent successfully. Response:', response);
            }
          });
        } catch (e) {
          console.error('[Masker][DEBUG] Exception sending message:', e);
        }
      }
    }, { threshold: 0.5 }); // 50% of post must be visible
  }
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
    selector: 'ytd-video-renderer, ytd-grid-video-renderer',
    getId: post => {
      const a = post.querySelector('a#video-title');
      if (a && a.href) return 'yt:' + a.href;
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
  // For Instagram, only mask/count main feed posts with a real permalink
  if (config.domain === 'instagram.com') {
    posts = Array.from(posts).filter(post => !!config.getId(post));
    selectorUsed = config.selector + ' (filtered for real posts)';
  }
  console.log(`[Masker][DEBUG] Using selector: ${selectorUsed}`);
  console.log(`[Masker][DEBUG] Found ${posts.length} main feed posts on screen.`);
  // Masking logic: only mask main feed posts
  if (maskingEnabled && posts.length >= threshold) {
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
  // Counting logic: only observe real posts
  posts.forEach(post => {
    let postId = null;
    try {
      postId = config.getId(post);
    } catch (e) {}
    if (!postId) return; // Only observe real posts
    if (!observedPostIds.has(postId)) {
      window._maskerIntersectionObserver.observe(post);
    }
  });
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

// Load threshold from storage
chrome.storage.sync.get({ maskThreshold: 10 }, (data) => {
  threshold = data.maskThreshold;
  console.log('[Masker][DEBUG] Loaded threshold from storage:', threshold);
  maskAndCountPosts();
});

// Observe DOM changes
const observer = new MutationObserver(debounceMaskAndCountPosts);
observer.observe(document.body, { childList: true, subtree: true });

// Initial run
window.addEventListener('DOMContentLoaded', () => {
  console.log('[Masker][DEBUG] DOMContentLoaded fired. Injecting toggle and running mask/count.');
  injectToggleButton();
  maskAndCountPosts();
});
