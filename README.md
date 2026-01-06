# 📊 Content Tracker - Chrome Extension

A powerful Chrome extension that helps you track your social media consumption and rewards content creation. Stay mindful of your digital habits while celebrating your creativity!

## ✨ Features

### 🎯 Smart Content Tracking
- **Real-time monitoring** of posts viewed across major social media platforms
- **Intelligent post detection** using IntersectionObserver API (only counts posts when 50%+ visible)
- **Automatic daily reset** - Fresh start every day at midnight
- **Platform support**: Instagram, LinkedIn, Twitter/X, YouTube (+ Shorts), Reddit, Quora

### 📈 Detailed Statistics
- **7-day history** showing daily consumption patterns
- **Content creation tracking** - See how many posts you've created
- **Beautiful dashboard** with gradient UI and smooth animations
- **Real-time updates** - Stats update as you browse

### 🎉 Gamification
- **Celebration animation** when you create content (post, tweet, comment)
- **Automatic counter reset** after content creation - rewarding engagement over passive scrolling
- **Visual masking** when consumption threshold is reached (configurable)

### 🛡️ Privacy First
- **All data stored locally** on your device
- **No external servers** - Your data never leaves your browser
- **Open source** - Full transparency

## 🚀 Installation

### Option 1: Load Unpacked (Development)
1. Clone this repository or download ZIP
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the extension folder
6. The extension icon will appear in your toolbar!

### Option 2: Chrome Web Store (Coming Soon)
_Extension will be available on the Chrome Web Store soon_

## 📱 How to Use

1. **Browse normally** - The extension tracks content automatically
2. **Click the extension icon** to view your statistics
3. **Create content** (post, tweet, comment) - Watch the celebration animation!
4. **Reset manually** using the "Reset Count" button if needed

## 🎨 Supported Platforms

| Platform | Posts | Reels/Shorts | Comments | Status |
|----------|-------|--------------|----------|--------|
| Instagram | ✅ | ✅ | ❌ | Working |
| LinkedIn | ✅ | ❌ | ❌ | Working |
| Twitter/X | ✅ | ❌ | ❌ | Working |
| YouTube | ✅ | ✅ | ✅ | Working |
| Reddit | ✅ | ❌ | ❌ | Working |
| Quora | ✅ | ❌ | ✅ | Working |

## 🔧 Configuration

Edit `contentScript.js` to customize:
- **Threshold**: Change `let threshold = 10;` (line 7) to your preferred limit
- **Observer sensitivity**: Modify `threshold: 0.5` (line 149) to adjust visibility detection
- **Add new platforms**: Add configuration to `siteConfigs` array (line 14)

## 📊 Data Storage

Data is stored in Chrome's local storage:
```javascript
{
  count: 0,              // Current day's count
  dailyData: {           // Historical data
    "2026-01-06": {
      consumed: 25,
      created: 3
    }
  },
  lastActiveDate: "2026-01-06"
}
```

## 🛠️ Development

### File Structure
```
ChromeTabs_Extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (data management)
├── contentScript.js       # Injected into pages (tracking logic)
├── popup.js              # Popup UI logic
├── index.html            # Popup UI
├── mask.css              # Content masking styles
└── icons/                # Extension icons
```

### Tech Stack
- **Manifest V3** (latest Chrome extension standard)
- **Vanilla JavaScript** (no frameworks)
- **Chrome Storage API** for data persistence
- **IntersectionObserver API** for accurate view detection
- **MutationObserver API** for dynamic content detection

## 🐛 Troubleshooting

### Counter not increasing?
1. Check console logs (F12) for `[Masker][DEBUG]` messages
2. Ensure the extension has permissions for the site
3. Refresh the page after updating the extension

### "Extension context invalidated" error?
1. Close all social media tabs
2. Reload the extension in `chrome://extensions`
3. Open fresh tabs

### Posts not detected on Instagram?
1. Make sure you're on the main feed (not profile/explore)
2. Scroll slowly to allow posts to load
3. Check that posts have visible permalinks

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use and modify!

## 🙏 Acknowledgments

Built with inspiration from digital wellness research and mindful technology principles.

## 📧 Support

Found a bug? Have a feature request? [Open an issue](https://github.com/yourusername/content-tracker/issues)

---

Made with ❤️ for mindful digital consumption
