// Test file for Gemini API integration
// Run this in the browser console to test the API functions

// Import the Gemini functions (you'll need to run this in the extension context)
// const { callGemini, parseGeminiResponse, compileMessagesForGemini, testApiKey } = await import('./gemini.js');

// Test data
const testMessages = [
  { role: 'user', text: 'Hello, how are you?' },
  { role: 'model', text: 'I am doing well, thank you for asking! How can I help you today?' },
  { role: 'context', text: 'This is some test context content.', title: 'Test Page', url: 'https://example.com', timestamp: new Date().toISOString() }
];

// Test message compilation
function testMessageCompilation() {
  console.log('Testing message compilation...');
  
  try {
    const result = compileMessagesForGemini(testMessages);
    console.log('Compiled result:', result);
    
    // Validate structure
    if (result && result.contents && Array.isArray(result.contents) && result.contents.length > 0 && result.systemInstruction) {
      console.log('✅ Message compilation successful');
      console.log('Contents:', result.contents);
      console.log('System Instruction:', result.systemInstruction);
      return true;
    } else {
      console.log('❌ Message compilation failed - invalid structure');
      return false;
    }
  } catch (error) {
    console.error('❌ Message compilation error:', error);
    return false;
  }
}

// Test API key validation
function testApiKeyValidation() {
  console.log('Testing API key validation...');
  
  const testCases = [
    { key: '', expected: false, description: 'Empty string' },
    { key: 'valid-api-key-123', expected: true, description: 'Valid format' },
    { key: null, expected: false, description: 'Null value' },
    { key: undefined, expected: false, description: 'Undefined value' }
  ];
  
  let allPassed = true;
  
  testCases.forEach(testCase => {
    const result = validateApiKey(testCase.key);
    const passed = result === testCase.expected;
    
    console.log(`${passed ? '✅' : '❌'} ${testCase.description}: ${result} (expected: ${testCase.expected})`);
    
    if (!passed) {
      allPassed = false;
    }
  });
  
  return allPassed;
}

// Test response parsing
function testResponseParsing() {
  console.log('Testing response parsing...');
  
  const validResponse = {
    candidates: [{
      content: {
        parts: [{ text: 'Hello, this is a test response!' }]
      }
    }]
  };
  
  const invalidResponses = [
    { candidates: [] }, // Empty candidates
    { candidates: [{ content: {} }] }, // Missing parts
    { candidates: [{ content: { parts: [] } }] }, // Empty parts
    { candidates: [{ content: { parts: [{}] } }] }, // Missing text
    null, // Null response
    {} // Empty object
  ];
  
  // Test valid response
  try {
    const result = parseGeminiResponse(validResponse);
    console.log('✅ Valid response parsed:', result);
  } catch (error) {
    console.log('❌ Valid response failed:', error.message);
    return false;
  }
  
  // Test invalid responses
  let allInvalidHandled = true;
  invalidResponses.forEach((response, index) => {
    try {
      parseGeminiResponse(response);
      console.log(`❌ Invalid response ${index + 1} should have failed`);
      allInvalidHandled = false;
    } catch (error) {
      console.log(`✅ Invalid response ${index + 1} properly rejected:`, error.message);
    }
  });
  
  return allInvalidHandled;
}

// Run all tests
function runAllTests() {
  console.log('🧪 Running Gemini API integration tests...\n');
  
  const results = {
    messageCompilation: testMessageCompilation(),
    apiKeyValidation: testApiKeyValidation(),
    responseParsing: testResponseParsing()
  };
  
  console.log('\n📊 Test Results:');
  console.log('Message Compilation:', results.messageCompilation ? '✅ PASS' : '❌ FAIL');
  console.log('API Key Validation:', results.apiKeyValidation ? '✅ PASS' : '❌ FAIL');
  console.log('Response Parsing:', results.responseParsing ? '✅ PASS' : '❌ FAIL');
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\n${allPassed ? '🎉 All tests passed!' : '⚠️ Some tests failed'}`);
  
  return allPassed;
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testMessageCompilation,
    testApiKeyValidation,
    testResponseParsing,
    runAllTests
  };
}

// Auto-run tests if this file is loaded directly
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAllTests);
  } else {
    runAllTests();
  }
}
