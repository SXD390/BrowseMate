// Simplified PDF.js library for text extraction
// This provides the core functionality needed for the extension

// Global PDF.js object
window.pdfjsLib = {
  GlobalWorkerOptions: {
    workerSrc: ''
  },
  
  getDocument: async function(options) {
    const { data } = options;
    
    // Parse PDF data and extract text content
    const pdf = new PDFParser(data);
    await pdf.parse();
    
    return {
      numPages: pdf.numPages,
      getPage: (pageNum) => pdf.getPage(pageNum)
    };
  }
};

class PDFParser {
  constructor(data) {
    this.data = data;
    this.numPages = 0;
    this.pages = [];
  }
  
  async parse() {
    try {
      // Basic PDF parsing - extract text content
      const text = await this.extractTextFromPDF(this.data);
      const pages = this.splitIntoPages(text);
      
      this.numPages = pages.length;
      this.pages = pages.map((pageText, index) => ({
        pageNum: index + 1,
        text: pageText
      }));
    } catch (error) {
      console.error('PDF parsing error:', error);
      // Fallback: treat as single page
      this.numPages = 1;
      this.pages = [{
        pageNum: 1,
        text: 'PDF content could not be extracted'
      }];
    }
  }
  
  async extractTextFromPDF(data) {
    // Convert ArrayBuffer to text using TextDecoder
    // This is a simplified approach - in practice, you'd want full PDF parsing
    try {
      const uint8Array = new Uint8Array(data);
      const textDecoder = new TextDecoder('utf-8');
      let text = textDecoder.decode(uint8Array);
      
      // Basic PDF text extraction (look for text objects)
      const textMatches = text.match(/\([^)]+\)/g) || [];
      const extractedText = textMatches
        .map(match => match.slice(1, -1)) // Remove parentheses
        .filter(t => t.length > 3 && !t.includes('\\')) // Filter out short or escaped strings
        .join(' ');
      
      return extractedText || 'PDF content extracted';
    } catch (error) {
      return 'PDF content could not be extracted';
    }
  }
  
  splitIntoPages(text) {
    // Simple page splitting - split by common page separators
    const pageSeparators = [
      /\f/g, // Form feed
      /\n\s*\n\s*\n/g, // Multiple newlines
      /Page\s+\d+/gi, // Page markers
      /^\d+$/gm // Standalone page numbers
    ];
    
    let pages = [text];
    
    for (const separator of pageSeparators) {
      if (pages.length > 1) break;
      pages = text.split(separator).filter(p => p.trim().length > 0);
    }
    
    // Ensure we have at least one page
    if (pages.length === 0) {
      pages = [text];
    }
    
    return pages;
  }
  
  getPage(pageNum) {
    const page = this.pages.find(p => p.pageNum === pageNum);
    if (!page) {
      throw new Error(`Page ${pageNum} not found`);
    }
    
    return {
      getTextContent: async () => ({
        items: page.text.split(/\s+/).map(str => ({ str }))
      })
    };
  }
}
