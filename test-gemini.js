// Test file for gemini.js functions
// Run this in the browser console to test the Gemini integration

// Test data
const testMessages = [
  {
    role: 'context',
    title: 'PKCS #11 Specification',
    url: 'https://docs.oasis-open.org/pkcs11/pkcs11-base/v2.40/os/pkcs11-base-v2.40-os.html',
    timestamp: '2024-01-01T00:00:00.000Z',
    markdown: `# PKCS #11 Cryptographic Token Interface Base Specification

## Introduction
This document defines the PKCS #11 cryptographic token interface.

## Functions
### CK_LOCKMUTEX
The CK_LOCKMUTEX function is used to lock a mutex for thread safety.

### CK_UNLOCKMUTEX  
The CK_UNLOCKMUTEX function unlocks a previously locked mutex.

## Implementation Notes
Mutex functions are essential for multi-threaded applications.`,
    essentialMarkdown: 'PKCS #11 specification with mutex functions'
  },
  {
    role: 'user',
    text: 'What does CK_LOCKMUTEX mean?'
  }
];

// Test message compilation with query-aware context
function testMessageCompilation() {
  console.log('--- Testing Message Compilation ---');
  try {
    const result = compileMessagesForGemini(testMessages);
    console.log('Compiled result:', result);

    // Validate structure
    if (result && result.contents && Array.isArray(result.contents) && result.contents.length > 0 && result.systemInstruction) {
      console.log('✅ Message compilation successful');
      console.log('Contents:', result.contents);
      console.log('System Instruction:', result.systemInstruction);
      
      // Check if query-aware context is working
      const contextContent = result.contents.find(c => c.role === 'user' && c.parts[0].text.includes('PAGE CONTEXT'));
      if (contextContent && contextContent.parts[0].text.includes('CK_LOCKMUTEX')) {
        console.log('✅ Query-aware context selection working - CK_LOCKMUTEX found in context');
      } else {
        console.log('⚠️ Query-aware context may not be working properly');
      }
      
      return true;
    } else {
      console.error('❌ Message compilation failed: Invalid structure or empty contents.');
      return false;
    }
  } catch (error) {
    console.error('❌ Message compilation failed:', error);
    return false;
  }
}

// Test API key validation
function testApiKeyValidation() {
  console.log('--- Testing API Key Validation ---');
  
  const testCases = [
    { key: '', expected: false, description: 'Empty key' },
    { key: 'invalid-key', expected: false, description: 'Invalid format key' },
    { key: 'AIzaSyC...', expected: true, description: 'Valid format key' }
  ];
  
  let passed = 0;
  testCases.forEach(testCase => {
    try {
      // Note: validateApiKey function doesn't exist in current gemini.js
      // This is a placeholder test
      console.log(`Testing: ${testCase.description}`);
      console.log(`Expected: ${testCase.expected}, Actual: N/A (function not implemented)`);
      console.log('⚠️ Skipping API key validation test');
    } catch (error) {
      console.error(`❌ Test failed for ${testCase.description}:`, error);
    }
  });
  
  console.log(`API Key validation tests: ${passed}/${testCases.length} passed`);
  return passed === testCases.length;
}

// Test response parsing
function testResponseParsing() {
  console.log('--- Testing Response Parsing ---');
  
  const testCases = [
    {
      response: {
        candidates: [{
          content: {
            parts: [{ text: 'Hello, world!' }]
          }
        }]
      },
      expected: 'Hello, world!',
      description: 'Valid response'
    },
    {
      response: {
        candidates: []
      },
      expected: '',
      description: 'Empty candidates'
    },
    {
      response: {},
      expected: '',
      description: 'Invalid response structure'
    }
  ];
  
  let passed = 0;
  testCases.forEach(testCase => {
    try {
      const result = parseGeminiResponse(testCase.response);
      const success = result === testCase.expected;
      
      if (success) {
        console.log(`✅ ${testCase.description}: Passed`);
        passed++;
      } else {
        console.error(`❌ ${testCase.description}: Expected "${testCase.expected}", got "${result}"`);
      }
    } catch (error) {
      console.error(`❌ Test failed for ${testCase.description}:`, error);
    }
  });
  
  console.log(`Response parsing tests: ${passed}/${testCases.length} passed`);
  return passed === testCases.length;
}

// Test query-aware context selection
function testQueryAwareContext() {
  console.log('--- Testing Query-Aware Context Selection ---');
  
  // This would test the pickRelevantSnippets function if it were exported
  // For now, we'll test it through the message compilation
  const queryMessages = [
    {
      role: 'context',
      title: 'Technical Document',
      url: 'https://example.com/doc',
      timestamp: '2024-01-01T00:00:00.000Z',
      markdown: 'This document contains information about CK_LOCKMUTEX and other functions. CK_LOCKMUTEX is used for thread safety in cryptographic operations.',
      essentialMarkdown: 'Technical document with mutex functions'
    },
    {
      role: 'user',
      text: 'Explain CK_LOCKMUTEX'
    }
  ];
  
  try {
    const result = compileMessagesForGemini(queryMessages);
    const contextContent = result.contents.find(c => c.role === 'user' && c.parts[0].text.includes('PAGE CONTEXT'));
    
    if (contextContent && contextContent.parts[0].text.includes('CK_LOCKMUTEX')) {
      console.log('✅ Query-aware context selection working');
      console.log('Context includes relevant term:', contextContent.parts[0].text.includes('CK_LOCKMUTEX'));
      return true;
    } else {
      console.error('❌ Query-aware context selection not working');
      return false;
    }
  } catch (error) {
    console.error('❌ Query-aware context test failed:', error);
    return false;
  }
}

// Run all tests
function runAllTests() {
  console.log('🧪 Running Cedric AI Side Panel Tests...\n');
  
  const results = [
    testMessageCompilation(),
    testApiKeyValidation(),
    testResponseParsing(),
    testQueryAwareContext()
  ];
  
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! The extension should work correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the console for details.');
  }
  
  return passed === total;
}

// Auto-run tests if loaded directly in browser
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAllTests);
  } else {
    runAllTests();
  }
}
