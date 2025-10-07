


// --- 1. SITE SELECTORS ---
const siteSelectors = {
	"youtube.com": "ytd-video-renderer, ytd-grid-video-renderer",
	"instagram.com": "article section > main article, article div._aagw, article[role='presentation']",
	"linkedin.com": "div.feed-shared-update-v2, div.feed-shared-news-module",
	"quora.com": "div.q-box.qu-mb--tiny",
	"reddit.com": "div[data-testid='post-container']",
	"x.com": "article", // formerly twitter.com
	"twitter.com": "article"
};

function getSiteSelector() {
	const host = window.location.hostname;
	for (const domain in siteSelectors) {
		if (host.includes(domain)) {
			console.log(`[ContentTracker] Using selector for ${domain}: ${siteSelectors[domain]}`);
			return siteSelectors[domain];
		}
	}
	console.log(`[ContentTracker] No selector found for ${host}`);
	return null;
}

const seenPosts = new WeakSet();

function checkNewPosts() {
	const selector = getSiteSelector();
	if (!selector) {
		console.log('[ContentTracker] No selector, skipping check.');
		return;
	}
	const posts = document.querySelectorAll(selector);
	let newCount = 0;
	posts.forEach((post) => {
		if (!seenPosts.has(post)) {
			seenPosts.add(post);
			newCount++;
		}
	});
	if (newCount > 0) {
		console.log(`[ContentTracker] Detected ${newCount} new posts. Sending increment.`);
		chrome.runtime.sendMessage({ type: "increment", count: newCount });
	} else {
		console.log('[ContentTracker] No new posts detected.');
	}
}

function trackVideos() {
	const videos = document.querySelectorAll("video");
	videos.forEach((video) => {
		if (video.dataset.trackerAttached) return;
		video.dataset.trackerAttached = "true";
		video.addEventListener("play", () => {
			console.log('[ContentTracker] Video played, incrementing.');
			chrome.runtime.sendMessage({ type: "increment", count: 1 });
		});
		const observer = new IntersectionObserver((entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					console.log('[ContentTracker] Video became visible, incrementing.');
					chrome.runtime.sendMessage({ type: "increment", count: 1 });
					observer.unobserve(entry.target);
				}
			});
		}, { threshold: 0.5 });
		observer.observe(video);
	});
}

function runAllTrackers() {
	checkNewPosts();
	trackVideos();
}

// Wait for DOMContentLoaded, then run trackers
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', runAllTrackers);
} else {
	runAllTrackers();
}

// Observe DOM changes for new posts/videos
const postObserver = new MutationObserver(checkNewPosts);
postObserver.observe(document.body, { childList: true, subtree: true });
const videoObserver = new MutationObserver(trackVideos);
videoObserver.observe(document.body, { childList: true, subtree: true });

// Listen for SPA navigation (pushState/replaceState/popstate)
function listenForSpaNavigation(callback) {
	let lastUrl = location.href;
	new MutationObserver(() => {
		const url = location.href;
		if (url !== lastUrl) {
			lastUrl = url;
			setTimeout(callback, 500); // Give DOM time to update
		}
	}).observe(document.body, { childList: true, subtree: true });
	window.addEventListener('popstate', () => setTimeout(callback, 500));
}
listenForSpaNavigation(runAllTrackers);
