
// Check for Chrome extension API availability
if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.sendMessage) {
	console.error("[ContentTracker] chrome.runtime.sendMessage is not available! This script must be run as a Chrome extension content script.");
} else {
	console.log("[ContentTracker][DEBUG] chrome.runtime.sendMessage is available. Content script loaded.");



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
					console.log(`[ContentTracker][DEBUG] Using selector for ${domain}: ${siteSelectors[domain]}`);
					return siteSelectors[domain];
				}
			}
			console.warn(`[ContentTracker][DEBUG] No selector found for ${host}`);
			return null;
		}

	const seenPosts = new WeakSet();


		function checkNewPosts() {
			const selector = getSiteSelector();
			if (!selector) {
				console.log('[ContentTracker][DEBUG] No selector, skipping check.');
				return;
			}
			const posts = document.querySelectorAll(selector);
			console.log(`[ContentTracker][DEBUG] Found ${posts.length} posts on screen.`);
			let newCount = 0;
			posts.forEach((post) => {
				if (!seenPosts.has(post)) {
					seenPosts.add(post);
					newCount++;
				}
			});
			if (newCount > 0) {
				console.log(`[ContentTracker][DEBUG] Detected ${newCount} new posts. Sending increment.`);
				try {
					chrome.runtime.sendMessage({ type: "increment", count: newCount }, (response) => {
						if (chrome.runtime.lastError) {
							console.error('[ContentTracker][DEBUG] Error sending message:', chrome.runtime.lastError.message);
						} else {
							console.log('[ContentTracker][DEBUG] Message sent successfully. Response:', response);
						}
					});
				} catch (e) {
					console.error('[ContentTracker][DEBUG] Exception sending message:', e);
				}
			} else {
				console.log('[ContentTracker][DEBUG] No new posts detected.');
			}
		}


		function trackVideos() {
			const videos = document.querySelectorAll("video");
			console.log(`[ContentTracker][DEBUG] Found ${videos.length} videos on screen.`);
			videos.forEach((video) => {
				if (video.dataset.trackerAttached) return;
				video.dataset.trackerAttached = "true";
				video.addEventListener("play", () => {
					console.log('[ContentTracker][DEBUG] Video played, incrementing.');
					try {
						chrome.runtime.sendMessage({ type: "increment", count: 1 }, (response) => {
							if (chrome.runtime.lastError) {
								console.error('[ContentTracker][DEBUG] Error sending message:', chrome.runtime.lastError.message);
							} else {
								console.log('[ContentTracker][DEBUG] Message sent successfully. Response:', response);
							}
						});
					} catch (e) {
						console.error('[ContentTracker][DEBUG] Exception sending message:', e);
					}
				});
				const observer = new IntersectionObserver((entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							console.log('[ContentTracker][DEBUG] Video became visible, incrementing.');
							try {
								chrome.runtime.sendMessage({ type: "increment", count: 1 }, (response) => {
									if (chrome.runtime.lastError) {
										console.error('[ContentTracker][DEBUG] Error sending message:', chrome.runtime.lastError.message);
									} else {
										console.log('[ContentTracker][DEBUG] Message sent successfully. Response:', response);
									}
								});
							} catch (e) {
								console.error('[ContentTracker][DEBUG] Exception sending message:', e);
							}
							observer.unobserve(entry.target);
						}
					});
				}, { threshold: 0.5 });
				observer.observe(video);
			});
		}


		function runAllTrackers() {
			console.log('[ContentTracker][DEBUG] Running all trackers...');
			checkNewPosts();
			trackVideos();
		}

	// Wait for DOMContentLoaded, then run trackers

		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', () => {
				console.log('[ContentTracker][DEBUG] DOMContentLoaded fired.');
				runAllTrackers();
			});
		} else {
			console.log('[ContentTracker][DEBUG] DOM already loaded.');
			runAllTrackers();
		}

	// Observe DOM changes for new posts/videos

		const postObserver = new MutationObserver(() => {
			console.log('[ContentTracker][DEBUG] DOM mutation detected for posts.');
			checkNewPosts();
		});
		postObserver.observe(document.body, { childList: true, subtree: true });
		const videoObserver = new MutationObserver(() => {
			console.log('[ContentTracker][DEBUG] DOM mutation detected for videos.');
			trackVideos();
		});
		videoObserver.observe(document.body, { childList: true, subtree: true });

	// Listen for SPA navigation (pushState/replaceState/popstate)

		function listenForSpaNavigation(callback) {
			let lastUrl = location.href;
			new MutationObserver(() => {
				const url = location.href;
				if (url !== lastUrl) {
					console.log(`[ContentTracker][DEBUG] SPA navigation detected: ${lastUrl} -> ${url}`);
					lastUrl = url;
					setTimeout(callback, 500); // Give DOM time to update
				}
			}).observe(document.body, { childList: true, subtree: true });
			window.addEventListener('popstate', () => {
				console.log('[ContentTracker][DEBUG] popstate event detected.');
				setTimeout(callback, 500);
			});
		}
		listenForSpaNavigation(runAllTrackers);
}
