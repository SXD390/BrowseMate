// Background service worker for Cedric AI Side Panel
// Handles side panel initialization and content extraction requests

// Initialize side panel when extension loads
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel) {
    chrome.sidePanel.setOptions({ path: 'panel.html', enabled: true });
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  if (chrome.sidePanel) {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (error) {
      console.error('Failed to open side panel:', error);
    }
  }
});

// Listen for messages from content scripts and panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXTRACT_CONTENT') {
    // Forward the request to the active tab's content script
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0] && tabs[0].url && 
          !tabs[0].url.startsWith('chrome://') && 
          !tabs[0].url.startsWith('chrome-extension://')) {
        try {
          // First, ensure content script is injected
          await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content.js']
          });
          
          // Wait a moment for the script to initialize
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Now send message to content script for extraction
          const response = await chrome.tabs.sendMessage(tabs[0].id, { type: 'EXTRACT_CONTENT' });
          sendResponse(response);
        } catch (error) {
          console.error('Content extraction failed:', error);
          
          // If content script injection fails, try fallback extraction
          try {
            const fallbackResult = await extractContentFallback(tabs[0]);
            sendResponse(fallbackResult);
          } catch (fallbackError) {
            console.error('Fallback extraction also failed:', fallbackError);
            sendResponse({ 
              error: 'Failed to extract content: ' + error.message,
              title: tabs[0].title || '',
              url: tabs[0].url,
              timestamp: new Date().toISOString()
            });
          }
        }
      } else {
        sendResponse({ 
          error: 'No active tab found or protected URL',
          title: '',
          url: '',
          timestamp: new Date().toISOString()
        });
      }
    });
    return true; // Keep message channel open for async response
  }
});

// Fallback content extraction using injected script
async function extractContentFallback(tab) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        // Basic content extraction fallback
        const title = document.title || '';
        const url = location.href;
        
        // Try to find main content
        const selectors = ['main', 'article', '[role="main"]', '.main-content', '.content', '#content', '#main'];
        let root = selectors.map(s => document.querySelector(s)).find(Boolean) || document.body;
        
        // Clone and clean
        const clone = root.cloneNode(true);
        clone.querySelectorAll('script,style,noscript,nav,footer,aside,.nav,.footer,.sidebar,.ad,.advertisement').forEach(el => el.remove());
        
        // Extract text
        const text = clone.textContent || '';
        const cleanText = text.replace(/\s+/g, ' ').trim();
        
        // Check if it's a PDF
        const isPdf = document.contentType === 'application/pdf' || /\.pdf($|[?#])/i.test(url);
        
        return {
          title,
          url,
          timestamp: new Date().toISOString(),
          markdown: isPdf ? 'PDF content (fallback extraction)' : cleanText,
          essentialMarkdown: cleanText.slice(0, isPdf ? 16000 : 12000),
          isFallback: true
        };
      }
    });
    
    if (results && results[0] && results[0].result) {
      const result = results[0].result;
      
      // Log extracted content from fallback
      console.log('📄 Page data extracted (FALLBACK). These are the contents:', {
        title: result.title,
        url: result.url,
        markdownLength: result.markdown?.length || 0,
        essentialLength: result.essentialMarkdown?.length || 0,
        markdown: result.markdown,
        essentialMarkdown: result.essentialMarkdown,
        isFallback: result.isFallback
      });
      
      return result;
    } else {
      throw new Error('Fallback extraction returned no results');
    }
  } catch (error) {
    throw new Error('Fallback extraction failed: ' + error.message);
  }
}
