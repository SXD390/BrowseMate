# PDF.js Setup for Cedric AI Side Panel

This extension now includes robust PDF text extraction using a simplified PDF.js implementation. For production use, you may want to use the full PDF.js library.

## Current Implementation

The extension includes a simplified PDF.js library in `vendor/pdfjs/` that provides basic text extraction functionality. This is sufficient for most use cases but has limitations.

## Enhanced PDF.js Setup (Optional)

For better PDF parsing, you can replace the simplified library with the full PDF.js distribution:

### Option 1: Install via npm (Recommended)

```bash
cd extension
npm install pdfjs-dist
```

Then copy the files:
```bash
cp node_modules/pdfjs-dist/build/pdf.mjs vendor/pdfjs/
cp node_modules/pdfjs-dist/build/pdf.worker.mjs vendor/pdfjs/
cp node_modules/pdfjs-dist/build/pdf.min.js vendor/pdfjs/
cp node_modules/pdfjs-dist/build/pdf.worker.min.js vendor/pdfjs/
```

### Option 2: Download from CDN

Download the latest PDF.js files from:
- https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.mjs
- https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.mjs

## Features

### PDF Detection
- Automatically detects PDF pages by:
  - Content-Type header
  - URL ending in .pdf
  - Embedded PDF iframes/embeds

### Text Extraction
- Extracts text from all PDF pages
- Converts to clean markdown format
- Preserves headings, paragraphs, and structure
- Handles large documents (up to 16KB essential content)

### Query-Aware Context
- When asking questions, the system automatically pulls relevant excerpts
- Terms like "CK_LOCKMUTEX" will include surrounding context
- Intelligent merging of overlapping text windows
- Fallback to essential content if no matches found

## Usage

1. Navigate to a PDF page
2. Click "Ingest this web page" in the Cedric panel
3. The PDF content will be extracted and stored
4. Ask questions about the content - the system will pull relevant excerpts

## Limitations

The simplified PDF.js implementation:
- May not handle complex PDF layouts perfectly
- Limited support for tables and images
- Basic text extraction without advanced formatting

For production use with complex PDFs, consider using the full PDF.js library.

## Troubleshooting

### PDF Extraction Fails
- Check browser console for errors
- Ensure the page is accessible (no CORS restrictions)
- Verify PDF.js files are properly loaded

### Content Not Found
- The query-aware system looks for exact term matches
- Try using the exact terms from the document
- Check the Sources tab to see what was ingested

## Performance Notes

- Large PDFs may take several seconds to process
- Essential content is limited to 16KB for performance
- Query-aware context adds minimal overhead
- Content is cached per session for faster access
