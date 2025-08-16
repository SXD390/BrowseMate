// Service worker for Cedric AI Side Panel
// Handles side panel setup and icon click behavior

// Initialize side panel when extension loads
chrome.runtime.onInstalled.addListener(() => {
  console.log('Cedric AI Side Panel installed');
  
  // Set up side panel options
  if (chrome.sidePanel) {
    chrome.sidePanel.setOptions({
      path: 'panel.html',
      enabled: true
    });
    
    // Configure panel to open when action icon is clicked
    chrome.sidePanel.setPanelBehavior({
      openPanelOnActionClick: true
    });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked, opening side panel');
  
  // Ensure side panel is open
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
  if (request.type === 'GET_ACTIVE_TAB') {
    // Return info about the currently active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        sendResponse({
          id: tabs[0].id,
          url: tabs[0].url,
          title: tabs[0].title
        });
      } else {
        sendResponse({ error: 'No active tab found' });
      }
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.type === 'EXTRACT_CONTENT') {
    // Handle content extraction request
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0] && tabs[0].url) {
        try {
          // Check if we can inject content script
          if (tabs[0].url.startsWith('chrome://') || tabs[0].url.startsWith('chrome-extension://')) {
            sendResponse({ error: 'Cannot extract content from protected URLs' });
            return;
          }
          
          // Inject content script and extract content
          const results = await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: extractPageContent
          });
          
          if (results && results[0] && results[0].result) {
            sendResponse(results[0].result);
          } else {
            sendResponse({ error: 'Failed to extract content' });
          }
        } catch (error) {
          console.error('Content extraction error:', error);
          sendResponse({ error: 'Failed to extract content: ' + error.message });
        }
      } else {
        sendResponse({ error: 'No active tab found' });
      }
    });
    return true; // Keep message channel open for async response
  }
});

// Content extraction function that will be injected into the page
function extractPageContent() {
  try {
    // Get basic page info
    const title = document.title || '';
    const url = window.location.href;
    
    // Extract main content
    let text = '';
    
    // Try to find main content areas
    const selectors = [
      'main',
      'article',
      '[role="main"]',
      '.main-content',
      '.content',
      '#content',
      '#main'
    ];
    
    let mainElement = null;
    for (const selector of selectors) {
      mainElement = document.querySelector(selector);
      if (mainElement) break;
    }
    
    // If no main element found, use body
    if (!mainElement) {
      mainElement = document.body;
    }
    
    // Extract text content, excluding unwanted elements
    const unwantedSelectors = 'script, style, noscript, nav, footer, aside, .nav, .footer, .sidebar, .ad, .advertisement';
    const unwantedElements = mainElement.querySelectorAll(unwantedSelectors);
    
    // Clone the element to avoid modifying the original DOM
    const clone = mainElement.cloneNode(true);
    
    // Remove unwanted elements from clone
    unwantedElements.forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    
    // Extract text content
    text = clone.textContent || '';
    
    // Clean up text
    text = text
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
    
    // Truncate if too long (keep under 40k chars)
    const maxLength = 40000;
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '... [Content truncated]';
    }
    
    return {
      title,
      url,
      text,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      error: 'Failed to extract content: ' + error.message,
      title: document.title || '',
      url: window.location.href,
      text: '',
      timestamp: new Date().toISOString()
    };
  }
}
