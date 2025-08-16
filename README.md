# Cedric — AI Side Panel

A Chrome Extension that provides an AI-powered side panel for web browsing, powered by Google Gemini. Cedric helps you summarize web pages, answer questions, and maintain conversation context across your browsing sessions.

## Features

- **Persistent Side Panel**: Opens from the extensions toolbar and stays open across tab switches
- **AI Chat Interface**: Powered by Google Gemini 2.5 Flash model
- **Page Content Ingestion**: Click "Ingest this web page" to add current page content to conversation context
- **Session Management**: Create and manage multiple chat sessions
- **Local Storage**: All data stored locally in your browser
- **No Server Required**: Direct integration with Gemini API

## Requirements

- Chrome browser version 114 or higher (for Side Panel API support)
- Google Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

## Installation

### 1. Download the Extension

1. Clone or download this repository
2. Navigate to the `extension` folder

### 2. Add Icon Files

Replace the placeholder files in the `assets` folder with actual PNG icons:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)  
- `icon128.png` (128x128 pixels)

You can create simple icons using any image editor or online icon generator.

### 3. Load as Unpacked Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select the `extension` folder
5. The extension should now appear in your extensions list

### 4. Set Up Your API Key

1. Click the Cedric extension icon in your toolbar
2. Click the gear icon (⚙️) to open settings
3. Enter your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
4. Click "Test" to verify your API key
5. Click outside the modal to save

## Usage

### Opening the Side Panel

- Click the Cedric extension icon in your Chrome toolbar
- The side panel will open on the right side of your browser window
- The panel persists across tab switches within the same window

### Chatting with Cedric

1. **Ask Questions**: Type your question in the composer at the bottom and press Enter or click Send
2. **Keyboard Shortcuts**: 
   - `Ctrl/Cmd + Enter`: Send message
   - `Esc`: Clear focus from composer

### Ingesting Web Page Content

1. Navigate to any web page you want to discuss
2. Click the "Ingest this web page" button in the side panel
3. The page content will be added to your current conversation context
4. Ask Cedric questions about the ingested content

### Managing Sessions

- **Create New Session**: Click the "+" button next to the session dropdown
- **Switch Sessions**: Use the dropdown to select different sessions
- **Export/Import**: Use the settings modal to backup or restore your conversations

### Settings

Access settings by clicking the gear icon (⚙️) in the panel header:

- **API Key Management**: Set and test your Gemini API key
- **URL Sharing**: Toggle whether to include current page URL in requests
- **Data Management**: Export, import, or clear your sessions

## Architecture

The extension is built using Manifest V3 with the following structure:

```
extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for side panel setup
├── panel.html            # Main UI structure
├── panel.css             # Styling and layout
├── panel.js              # Main UI logic and session management
├── storage.js            # Chrome storage wrapper
├── gemini.js             # Gemini API integration
├── content.js            # Content script for page extraction
├── assets/               # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

### Key Components

- **Side Panel API**: Uses Chrome's Side Panel API for persistent panel display
- **Content Extraction**: Intelligently extracts readable content from web pages
- **Session Persistence**: Stores conversations locally using Chrome storage
- **Gemini Integration**: Direct API calls to Google's Gemini model
- **Error Handling**: Comprehensive error handling with user-friendly messages

## Development

### Prerequisites

- Chrome browser with developer mode enabled
- Basic knowledge of JavaScript and Chrome Extensions

### Local Development

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Cedric extension
4. Test your changes

### Testing

- Test on various websites to ensure content extraction works properly
- Verify side panel persistence across tab switches
- Test API key validation and error handling
- Check responsive design on different panel widths

### Debugging

- Use Chrome DevTools on the side panel (right-click → Inspect)
- Check the background service worker console in `chrome://extensions/`
- Monitor network requests in DevTools Network tab

## Troubleshooting

### Common Issues

**Side Panel Not Opening**
- Ensure Chrome version 114+ is installed
- Check that the extension is properly loaded
- Verify permissions in `chrome://extensions/`

**API Key Errors**
- Verify your API key is correct and active
- Check that you have sufficient Gemini API quota
- Ensure the key has proper permissions

**Content Extraction Fails**
- Some sites may block content extraction
- Protected URLs (chrome://, chrome-extension://) cannot be processed
- Check browser console for error messages

**Panel Closes Unexpectedly**
- The side panel should persist across tab switches
- If it closes, try clicking the extension icon again
- Check for any JavaScript errors in the console

### Getting Help

1. Check the browser console for error messages
2. Verify your Chrome version supports Side Panel API
3. Ensure all required permissions are granted
4. Test with a simple website first

## Security & Privacy

- **Local Storage**: All data is stored locally in your browser
- **No Server**: No data is sent to external servers except Gemini API
- **API Key**: Your Gemini API key is stored locally and only sent to Google's servers
- **Content Extraction**: Only extracts text content, no images or scripts are captured

## Contributing

Contributions are welcome! Please ensure:

- Code follows the existing style and patterns
- New features include proper error handling
- UI changes maintain accessibility standards
- All changes are tested thoroughly

## License

This project is open source. Feel free to use, modify, and distribute as needed.

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Verify your Chrome version and extension permissions
4. Test with a fresh installation

---

**Note**: This extension requires Chrome 114+ for full Side Panel API functionality. For older versions, some features may not work as expected.
