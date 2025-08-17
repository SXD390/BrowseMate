// Test script for content script functionality
// Run this in the browser console to test content extraction

console.log('🧪 Testing Cedric Content Script...');

// Test if content script is loaded
if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.log('✅ Chrome runtime available');
  
  // Test message sending
  chrome.runtime.sendMessage({ type: 'EXTRACT_CONTENT' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('❌ Message failed:', chrome.runtime.lastError);
    } else if (response) {
      console.log('✅ Content extraction response:', response);
      
      if (response.error) {
        console.error('❌ Extraction error:', response.error);
      } else {
        console.log('✅ Content extracted successfully');
        console.log('Title:', response.title);
        console.log('URL:', response.url);
        console.log('Markdown length:', response.markdown?.length || 0);
        console.log('Essential length:', response.essentialMarkdown?.length || 0);
      }
    } else {
      console.log('⚠️ No response received');
    }
  });
} else {
  console.error('❌ Chrome runtime not available');
}

// Test content extraction functions directly
console.log('\n📄 Testing extraction functions...');

// Test PDF detection
const testUrls = [
  'https://example.com/page.html',
  'https://example.com/document.pdf',
  'https://docs.oasis-open.org/pkcs11/pkcs11-base/v2.40/os/pkcs11-base-v2.40-os.html'
];

testUrls.forEach(url => {
  const isPdf = url.includes('.pdf') || url.includes('docs.oasis-open.org');
  console.log(`${url} -> ${isPdf ? 'PDF' : 'HTML'}`);
});

console.log('\n🎯 Content script test completed!');
