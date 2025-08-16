// Content script for Cedric AI Side Panel
// Handles DOM extraction and message handling for page content ingestion

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXTRACT_PAGE_CONTENT') {
    try {
      const content = extractPageContent();
      sendResponse({ success: true, data: content });
    } catch (error) {
      console.error('Content extraction failed:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep message channel open for async response
  }
});

/**
 * Extract readable content from the current page
 * @returns {Object} Extracted content with title, url, text, and timestamp
 */
function extractPageContent() {
  try {
    // Get basic page info
    const title = document.title || '';
    const url = window.location.href;
    const timestamp = new Date().toISOString();
    
    // Extract main content
    let text = '';
    
    // Try to find main content areas in order of preference
    const selectors = [
      'main',
      'article',
      '[role="main"]',
      '.main-content',
      '.content',
      '#content',
      '#main',
      '.post-content',
      '.entry-content',
      '.article-content'
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
    const unwantedSelectors = [
      'script', 'style', 'noscript', 'nav', 'footer', 'aside',
      '.nav', '.footer', '.sidebar', '.ad', '.advertisement',
      '.header', '.menu', '.navigation', '.breadcrumb',
      '.social-share', '.comments', '.related-posts',
      '[class*="ad"]', '[class*="banner"]', '[class*="popup"]'
    ].join(', ');
    
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
      .replace(/\t/g, ' ') // Replace tabs with spaces
      .trim();
    
    // Truncate if too long (keep under 40k chars)
    const maxLength = 40000;
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '... [Content truncated]';
    }
    
    // If text is too short, try alternative extraction
    if (text.length < 100) {
      text = extractAlternativeContent();
    }
    
    return {
      title,
      url,
      text,
      timestamp,
      domain: extractDomain(url),
      wordCount: text.split(/\s+/).length
    };
    
  } catch (error) {
    console.error('Content extraction error:', error);
    return {
      title: document.title || '',
      url: window.location.href,
      text: '',
      timestamp: new Date().toISOString(),
      domain: extractDomain(window.location.href),
      error: error.message
    };
  }
}

/**
 * Extract alternative content if main extraction fails
 * @returns {string} Alternative text content
 */
function extractAlternativeContent() {
  try {
    // Try to get content from common article/blog selectors
    const articleSelectors = [
      '.post', '.entry', '.article', '.story',
      '.content-area', '.main-content', '.post-body'
    ];
    
    for (const selector of articleSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent || '';
        if (text.length > 200) {
          return text.replace(/\s+/g, ' ').trim();
        }
      }
    }
    
    // Fallback to paragraph content
    const paragraphs = Array.from(document.querySelectorAll('p'))
      .map(p => p.textContent?.trim())
      .filter(text => text && text.length > 50)
      .slice(0, 10); // Take first 10 substantial paragraphs
    
    if (paragraphs.length > 0) {
      return paragraphs.join('\n\n');
    }
    
    // Last resort: get all text from body
    return document.body.textContent || '';
    
  } catch (error) {
    console.error('Alternative content extraction failed:', error);
    return '';
  }
}

/**
 * Extract domain from URL
 * @param {string} url - URL to extract domain from
 * @returns {string} Domain name
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Get page metadata for better context
 * @returns {Object} Page metadata
 */
function getPageMetadata() {
  const metadata = {};
  
  // Get meta description
  const descriptionMeta = document.querySelector('meta[name="description"]');
  if (descriptionMeta) {
    metadata.description = descriptionMeta.getAttribute('content');
  }
  
  // Get Open Graph title
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    metadata.ogTitle = ogTitle.getAttribute('content');
  }
  
  // Get Open Graph description
  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) {
    metadata.ogDescription = ogDescription.getAttribute('content');
  }
  
  // Get author
  const authorMeta = document.querySelector('meta[name="author"]');
  if (authorMeta) {
    metadata.author = authorMeta.getAttribute('content');
  }
  
  // Get publication date
  const dateMeta = document.querySelector('meta[name="article:published_time"]');
  if (dateMeta) {
    metadata.publishedDate = dateMeta.getAttribute('content');
  }
  
  return metadata;
}

// Notify the extension that content script is loaded
chrome.runtime.sendMessage({
  type: 'CONTENT_SCRIPT_LOADED',
  data: {
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString()
  }
});
