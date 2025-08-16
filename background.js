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
    const title = document.title || '';
    const url = window.location.href;

    // Prefer a main/article region; fallback to body
    const selectors = ['main','article','[role="main"]','.main-content','.content','#content','#main'];
    let root = selectors.map(s => document.querySelector(s)).find(Boolean) || document.body;

    // Clone & strip noise
    const clone = root.cloneNode(true);
    clone.querySelectorAll('script,style,noscript,nav,footer,aside,.nav,.footer,.sidebar,.ad,.advertisement').forEach(el => el.remove());

    // Convert DOM → very lightweight markdown (h1–h3, p, li, a, code)
    const toMarkdown = (node) => {
      const blocks = [];
      const walk = (el) => {
        const tag = (el.tagName || '').toLowerCase();
        if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
          const lvl = tag === 'h1' ? '#' : tag === 'h2' ? '##' : '###';
          blocks.push(`${lvl} ${el.textContent.trim()}\n`);
        } else if (tag === 'p') {
          blocks.push(`${inline(el).trim()}\n`);
        } else if (tag === 'li') {
          blocks.push(`- ${inline(el).trim()}\n`);
        } else {
          Array.from(el.children).forEach(walk);
        }
      };
      const inline = (el) => {
        return Array.from(el.childNodes).map(n => {
          if (n.nodeType === Node.TEXT_NODE) return n.nodeValue;
          if (n.nodeType === Node.ELEMENT_NODE) {
            const t = n.tagName.toLowerCase();
            if (t === 'code') return '`' + n.textContent + '`';
            if (t === 'strong' || t === 'b') return '**' + inline(n) + '**';
            if (t === 'em' || t === 'i') return '*' + inline(n) + '*';
            if (t === 'a') {
              const href = n.getAttribute('href') || '#';
              return `[${n.textContent}](${href})`;
            }
            return inline(n);
          }
          return '';
        }).join('');
      };
      walk(node);
      return blocks.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    };

    const markdown = toMarkdown(clone);

    // "Essential bits": keep headings + first paragraphs, up to ~3000 chars
    let essentialMarkdown = markdown.split('\n')
      .filter(line => line.startsWith('#') || line.trim().length > 0)
      .slice(0, 300)                      // rough cap on lines
      .join('\n')
      .slice(0, 3000);

    if (!essentialMarkdown) essentialMarkdown = (clone.textContent || '').trim().slice(0, 3000);

    return {
      title,
      url,
      timestamp: new Date().toISOString(),
      markdown,
      essentialMarkdown
    };
  } catch (error) {
    return {
      error: 'Failed to extract content: ' + error.message,
      title: document.title || '',
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
  }
}
