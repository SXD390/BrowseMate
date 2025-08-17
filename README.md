# BrowseMate — AI Side Panel

A Chrome extension that provides an AI-powered side panel for summarizing and chatting about web pages using Google Gemini.

## Features

- **Persistent Side Panel**: Right-side panel that stays open across tab switches
- **AI Chat**: Interactive chat with Google Gemini AI
- **Page Ingestion**: Extract and analyze web page content
- **Session Management**: Multiple chat sessions with history
- **PDF Support**: Full text extraction from PDF documents
- **Smart Context**: Query-aware content selection for better responses

## Installation

1. **Clone or download** this repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer mode** (toggle in top-right)
4. **Click "Load unpacked"** and select the `extension` folder
5. **Pin the extension** to your toolbar for easy access

## Setup

1. **Get a Gemini API Key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Copy the key

2. **Configure BrowseMate**:
   - Click the BrowseMate extension icon
   - Click the settings gear (⚙️)
   - Paste your API key and click "Test"
   - Save settings

## Usage

### Basic Chat
- Click the BrowseMate extension icon to open the side panel
- Type your question in the chat box
- Press Enter or click Send to get an AI response

### Page Ingestion
- Navigate to any web page you want to discuss
- Click "Ingest this web page" in the BrowseMate panel
- The page content is now available for AI analysis
- Ask questions about the ingested content

### Session Management
- **Switch Sessions**: Use the dropdown to switch between different chat sessions
- **New Session**: Click the "+" button to start a fresh conversation
- **Export/Import**: Save and restore your chat sessions

### Sources Tab
- View all ingested pages for the current session
- Open or remove sources as needed
- See timestamps and page titles

## Architecture

### Core Components
- **`panel.html/js`**: Main UI and user interactions
- **`background.js`**: Service worker for content extraction
- **`content.js`**: Injected into web pages for content extraction
- **`gemini.js`**: Gemini API integration and message compilation
- **`storage.js`**: Local storage management for sessions and settings

### Content Extraction
- **HTML Pages**: Intelligent DOM parsing with noise removal
- **PDF Documents**: Full text extraction using PDF.js
- **Markdown Conversion**: Clean, structured content format
- **Smart Slicing**: Query-aware context selection

### AI Integration
- **Direct API Calls**: No proxy server required
- **Context Management**: Intelligent message compilation
- **Error Handling**: Clear error messages and retry logic
- **Token Optimization**: Efficient prompt construction

## Development

### Project Structure
```
extension/
├── manifest.json          # Extension configuration
├── panel.html            # Main UI structure
├── panel.css             # Styling and layout
├── panel.js              # UI logic and interactions
├── background.js         # Service worker
├── content.js            # Content script
├── gemini.js             # AI API integration
├── storage.js            # Data persistence
├── vendor/pdfjs/         # PDF processing library
└── assets/               # Icons and resources
```

### Key Technologies
- **Chrome Extension Manifest V3**
- **Chrome Side Panel API**
- **Google Gemini AI API**
- **PDF.js for document processing**
- **Modern ES6+ JavaScript**

### Development Setup
1. **Load the extension** in Chrome as described above
2. **Make changes** to source files
3. **Reload the extension** in `chrome://extensions/`
4. **Test changes** in the side panel

### Debugging
- **Console Logs**: Check browser console for debugging info
- **Extension Errors**: View errors in `chrome://extensions/`
- **Content Scripts**: Use browser dev tools on target pages
- **Background Script**: Check service worker logs

## Troubleshooting

### Common Issues

**"API key not set"**
- Ensure you've entered your Gemini API key in settings
- Verify the key is valid by testing it

**"Failed to extract content"**
- Check if the page is protected (chrome://, chrome-extension://)
- Ensure the page has fully loaded
- Try refreshing the page and ingesting again

**"Could not establish connection"**
- Reload the extension in `chrome://extensions/`
- Check if the target page has any content blocking

**PDF extraction issues**
- Ensure the PDF is publicly accessible
- Check browser console for PDF.js errors
- Verify the PDF isn't password-protected

### Performance Tips
- **Limit context**: Don't ingest too many pages in one session
- **Clear sessions**: Remove old sessions to free up storage
- **API limits**: Be mindful of Gemini API rate limits

## Security

- **Local Storage**: All data is stored locally in your browser
- **No Proxy**: Direct communication with Google Gemini API
- **API Key**: Your API key is stored locally and never shared
- **Content Access**: Only extracts content from pages you explicitly ingest

## Contributing

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Test thoroughly**
5. **Submit a pull request**

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For issues, questions, or contributions:
- **GitHub Issues**: Report bugs or request features
- **Documentation**: Check this README and code comments
- **Community**: Contribute improvements and share ideas

---

**BrowseMate** — Making web browsing smarter with AI assistance. 🚀
