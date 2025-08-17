// content.js
// Robust content extraction for both PDFs and HTML pages

// Flag to track if content script is ready
let isInitialized = false;

const isPdfPage = () =>
  document.contentType === 'application/pdf' ||
  /\.pdf($|[?#])/i.test(location.href) ||
  document.querySelector('embed[type="application/pdf"], iframe[src*=".pdf"]');

async function extractPage() {
  try {
    if (isPdfPage()) {
      return await extractPdfAsMarkdown(location.href);
    } else {
      return extractHtmlAsMarkdown();
    }
  } catch (e) {
    return { 
      error: String(e), 
      title: document.title || '', 
      url: location.href, 
      timestamp: new Date().toISOString() 
    };
  }
}

async function extractPdfAsMarkdown(url) {
  try {
    // Load pdf.js locally - now using global object
    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) {
      // Load the script if not already loaded
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('vendor/pdfjs/pdf.mjs');
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    
    // Set worker source
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('vendor/pdfjs/pdf.worker.mjs');

    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) {
      throw new Error(`Failed to fetch PDF: ${resp.status}`);
    }
    
    const buf = await resp.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    
    let all = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      const text = tc.items.map(it => it.str).join(' ');
      all.push(text.replace(/\s+/g, ' ').trim());
    }
    
    const fullText = all.join('\n\n');
    const markdown = toSimpleMarkdownFromText(fullText);
    const essentialMarkdown = sliceEssential(markdown, 16000); // generous cap for specs

    const result = {
      title: document.title || 'PDF Document',
      url: location.href,
      timestamp: new Date().toISOString(),
      markdown,
      essentialMarkdown
    };

    // Log extracted content
    console.log('📄 Page data extracted. These are the contents:', {
      title: result.title,
      url: result.url,
      markdownLength: result.markdown?.length || 0,
      essentialLength: result.essentialMarkdown?.length || 0,
      markdown: result.markdown,
      essentialMarkdown: result.essentialMarkdown
    });

    return result;
  } catch (error) {
    console.error('PDF extraction failed:', error);
    // Fallback to basic text extraction
    return {
      title: document.title || 'PDF Document',
      url: location.href,
      timestamp: new Date().toISOString(),
      markdown: 'PDF content could not be fully extracted',
      essentialMarkdown: 'PDF content could not be fully extracted'
    };
  }
}

function extractHtmlAsMarkdown() {
  const title = document.title || '';
  const url = location.href;
  
  // Prefer semantic content regions
  const selectors = [
    'main',
    'article', 
    '[role="main"]',
    '.main-content',
    '.content',
    '#content',
    '#main',
    '.post-content',
    '.entry-content'
  ];
  
  let root = selectors.map(s => document.querySelector(s)).find(Boolean) || document.body;

  // Clone and clean the DOM
  const clone = root.cloneNode(true);
  
  // Remove noise elements
  const noiseSelectors = [
    'script', 'style', 'noscript', 'nav', 'footer', 'aside',
    '.nav', '.footer', '.sidebar', '.ad', '.advertisement',
    '.header', '.menu', '.breadcrumb', '.pagination',
    '.social-share', '.comments', '.related-posts'
  ];
  
  noiseSelectors.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });

  const markdown = domToMarkdown(clone);
  const essentialMarkdown = sliceEssential(markdown, 12000);

  const result = { 
    title, 
    url, 
    timestamp: new Date().toISOString(),
    markdown,
    essentialMarkdown 
  };

  // Log extracted content
  console.log('📄 Page data extracted. These are the contents:', {
    title: result.title,
    url: result.url,
    markdownLength: result.markdown?.length || 0,
    essentialLength: result.essentialMarkdown?.length || 0,
    markdown: result.markdown,
    essentialMarkdown: result.essentialMarkdown
  });

  return result;
}

function domToMarkdown(node) {
  const blocks = [];
  
  const walk = (el) => {
    if (el.nodeType === Node.TEXT_NODE) return;
    
    const tag = (el.tagName || '').toLowerCase();
    
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
      const level = parseInt(tag.charAt(1));
      const prefix = '#'.repeat(level);
      blocks.push(`${prefix} ${el.textContent.trim()}\n`);
    } else if (tag === 'p') {
      const text = inline(el).trim();
      if (text) blocks.push(`${text}\n`);
    } else if (tag === 'li') {
      const text = inline(el).trim();
      if (text) blocks.push(`- ${text}\n`);
    } else if (tag === 'blockquote') {
      const text = inline(el).trim();
      if (text) blocks.push(`> ${text}\n`);
    } else if (tag === 'pre') {
      const text = el.textContent.trim();
      if (text) blocks.push(`\`\`\`\n${text}\n\`\`\`\n`);
    } else if (tag === 'code' && el.parentElement?.tagName !== 'PRE') {
      const text = el.textContent.trim();
      if (text) blocks.push(`\`${text}\``);
    } else if (tag === 'table') {
      const tableMarkdown = tableToMarkdown(el);
      if (tableMarkdown) blocks.push(tableMarkdown);
    } else {
      // Recursively process child elements
      Array.from(el.children).forEach(walk);
    }
  };
  
  const inline = (el) => {
    return Array.from(el.childNodes).map(n => {
      if (n.nodeType === Node.TEXT_NODE) return n.nodeValue;
      if (n.nodeType !== Node.ELEMENT_NODE) return '';
      
      const t = n.tagName.toLowerCase();
      
      if (t === 'code') return '`' + n.textContent + '`';
      if (t === 'strong' || t === 'b') return '**' + inline(n) + '**';
      if (t === 'em' || t === 'i') return '*' + inline(n) + '*';
      if (t === 'a') {
        const href = n.getAttribute('href') || '#';
        return `[${n.textContent}](${href})`;
      }
      if (t === 'br') return '\n';
      
      return inline(n);
    }).join('');
  };
  
  walk(node);
  
  // Clean up excessive whitespace
  return blocks.join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/gm, '')
    .trim();
}

function tableToMarkdown(table) {
  try {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return '';
    
    const markdownRows = rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td, th'));
      return '| ' + cells.map(cell => cell.textContent.trim().replace(/\|/g, '\\|')).join(' | ') + ' |';
    });
    
    if (markdownRows.length > 1) {
      // Add separator row for headers
      const headerRow = markdownRows[0];
      const cellCount = (headerRow.match(/\|/g) || []).length - 1;
      const separator = '| ' + '--- |'.repeat(cellCount);
      markdownRows.splice(1, 0, separator);
    }
    
    return markdownRows.join('\n') + '\n';
  } catch (error) {
    return '';
  }
}

function toSimpleMarkdownFromText(txt) {
  // Convert plain text to paragraph-like markdown
  const lines = txt.split(/\n{2,}/)
    .map(s => s.trim())
    .filter(Boolean);
  
  return lines.map(l => l || '').join('\n\n');
}

function sliceEssential(md, maxChars) {
  // Keep headings and early paragraphs, but allow large caps for specs
  const out = md.split('\n').slice(0, 2500).join('\n'); // ~rough limit
  return out.slice(0, maxChars);
}

// Initialize the content script
function initializeContentScript() {
  if (isInitialized) return;
  
  console.log('Cedric content script initializing...');
  
  // Set up message listener
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'EXTRACT_CONTENT') {
      console.log('Content extraction request received');
      
      // Extract content asynchronously
      extractPage().then(result => {
        console.log('Content extraction completed:', result);
        sendResponse(result);
      }).catch(error => {
        console.error('Content extraction error:', error);
        sendResponse({ 
          error: 'Content extraction failed: ' + error.message,
          title: document.title || '',
          url: location.href,
          timestamp: new Date().toISOString()
        });
      });
      
      return true; // Keep message channel open for async response
    }
  });
  
  isInitialized = true;
  console.log('Cedric content script initialized successfully');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}

// Also initialize immediately if already loaded
if (document.readyState !== 'loading') {
  initializeContentScript();
}
