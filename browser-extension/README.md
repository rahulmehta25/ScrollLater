# ScrollLater Browser Extension

Save articles, videos, and content to read later with one click.

## Features

- **Quick Save Popup** - Click the extension icon to save the current page with notes and tags
- **Context Menu** - Right-click to save pages, links, selected text, or images
- **Keyboard Shortcuts**
  - `Ctrl+Shift+S` / `Cmd+Shift+S` - Open popup
  - `Alt+S` / `Option+S` - Quick save current page
- **Content Extraction** - Automatically extracts article title, description, author, and more
- **Floating Button** (optional) - Shows a save button on every page

## Installation

### Chrome / Edge / Brave

1. Download or clone this repository
2. Open `chrome://extensions` (or equivalent for your browser)
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the `browser-extension` folder

### Firefox

1. Open `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select any file in the `browser-extension` folder

## Development

### File Structure

```
browser-extension/
├── manifest.json          # Extension manifest (Manifest V3)
├── _locales/en/           # Internationalization
├── icons/                 # Extension icons
└── src/
    ├── background/        # Service worker
    │   └── background.js  # Context menus, keyboard shortcuts, API calls
    ├── content/           # Content scripts
    │   ├── content.js     # Metadata extraction, floating button
    │   └── content.css    # Floating button styles
    └── popup/             # Extension popup
        ├── popup.html
        ├── popup.css
        └── popup.js
```

### Building for Production

For Chrome Web Store submission, zip the extension folder:

```bash
cd browser-extension
zip -r scrolllater-extension.zip . -x "*.git*" -x "*.DS_Store"
```

### API Configuration

By default, the extension connects to `https://scrolllater.com`. For local development:

1. Open the extension popup
2. Click the settings icon
3. Enter `http://localhost:3000` as the API URL

### Authentication

The extension uses token-based authentication. Users must sign in through the popup to enable saving.

## Permissions

- `activeTab` - Access current tab URL and content
- `storage` - Store authentication and settings
- `contextMenus` - Add right-click menu options
- `notifications` - Show save confirmations

## Privacy

The extension only accesses page content when you explicitly save. No tracking or analytics are included.
