// Gemini API integration for Cedric AI Side Panel
// Handles API calls to Google's Gemini model with proper error handling

const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Default generation config
const DEFAULT_GENERATION_CONFIG = {
  thinkingConfig: { thinkingBudget: 0 }
};

// Error mapping for common Gemini API errors
const ERROR_MESSAGES = {
  400: 'Invalid request - please check your input',
  401: 'Invalid API key - please check your settings',
  403: 'Access denied - check your API key permissions',
  429: 'Rate limit exceeded - please wait a moment and try again',
  500: 'Gemini service error - please try again later',
  502: 'Gemini service temporarily unavailable',
  503: 'Gemini service overloaded - please try again later',
  504: 'Request timeout - please try again'
};

// Retry configuration for failed requests
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
};

/**
 * Compile messages for Gemini API format with proper roles and system instruction
 * @param {Array} messages - Array of message objects
 * @param {Object} settings - User settings
 * @returns {Object} Object with contents array and systemInstruction
 */
export function compileMessagesForGemini(messages, settings = {}) {
  // Optional system prompt lives *outside* contents
  const systemInstruction = {
    parts: [{
      text: [
        "You are BrowseMate, a fast, reliable chat agent that runs inside a web browser.",
        "You receive three kinds of inputs:",
        "1) prior chat turns, 2) the user's current prompt, and 3) optional PAGE CONTEXT blocks that were actively ingested from webpages.",
        "Guidelines:",
        "- Always prefer facts from the most relevant PAGE CONTEXT blocks. Cite the source title or domain in-line (e.g., \"(source: example.com)\") when you rely on it.",
        "- If PAGE CONTEXT conflicts, call this out and explain the divergence; prefer the most recent, specific source.",
        "- Be concise by default; use bullet points for lists. Format code with fenced blocks.",
        "- If the question is general and PAGE CONTEXT is irrelevant, answer normally without forcing a summary.",
        "- Do not invent URLs or content that wasn't provided.",
        "- When asked to summarize a page, extract the essentials (headings, key bullets, data) and avoid boilerplate.",
        "Output should be helpful, accurate, and immediately usable."
      ].join('\n')
    }]
  };

  // Keep messages small. Only last ~8 user/model turns + last 5 contexts (trimmed)
  const MAX_TURNS = 8;
  const MAX_CONTEXT = 5;
  const MAX_CONTEXT_CHARS = 3000;

  const chatHistory = [];
  const userAndModel = messages.filter(m => m.role === 'user' || m.role === 'model').slice(-MAX_TURNS);
  const contexts = messages
    .filter(m => m.role === 'context')
    .slice(-MAX_CONTEXT)
    .map(m => {
      // Prefer essential markdown if present, else fall back
      const md = (m.essentialMarkdown || m.markdown || m.text || '').slice(0, MAX_CONTEXT_CHARS);
      const header = `PAGE CONTEXT — ${m.title || 'Untitled'} (${m.url || 'Unknown'}) — captured ${m.timestamp || ''}`;
      return { role: 'user', parts: [{ text: `${header}\n\n${md}` }] };
    });

  userAndModel.forEach(m => {
    if (m.role === 'user') chatHistory.push({ role: 'user', parts: [{ text: m.text }] });
    if (m.role === 'model') chatHistory.push({ role: 'model', parts: [{ text: m.text }] });
  });

  const contents = [...contexts, ...chatHistory];
  return { contents, systemInstruction };
}

/**
 * Call Gemini API with exponential backoff retry logic
 * @param {Object} params - API call parameters
 * @param {string} params.apiKey - Gemini API key
 * @param {Array} params.contents - Array of content objects for Gemini
 * @param {Object} params.systemInstruction - Optional system instruction
 * @param {Object} params.generationConfig - Optional generation configuration
 * @returns {Promise<Object>} Gemini API response
 */
export async function callGemini({ apiKey, contents, systemInstruction, generationConfig = null }) {
  if (!apiKey) {
    throw new Error('API key is required');
  }

  if (!contents || !Array.isArray(contents) || contents.length === 0) {
    throw new Error('Contents array is required and must not be empty');
  }

  const config = generationConfig || DEFAULT_GENERATION_CONFIG;
  
  return await retryWithBackoff(async () => {
    return await makeGeminiRequest(apiKey, contents, systemInstruction, config);
  });
}

/**
 * Make a single request to Gemini API
 * @param {string} apiKey - Gemini API key
 * @param {Array} contents - Array of content objects
 * @param {Object} systemInstruction - System instruction
 * @param {Object} generationConfig - Generation configuration
 * @returns {Promise<Object>} API response
 */
async function makeGeminiRequest(apiKey, contents, systemInstruction, generationConfig) {
  const response = await fetch(GEMINI_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents,
      ...(systemInstruction ? { systemInstruction } : {}),
      generationConfig
    })
  });

  if (!response.ok) {
    // Surface Gemini's actual error for 4xx so you can see what's wrong
    const maybeJson = await response.text();
    let detail = maybeJson;
    try { 
      detail = JSON.parse(maybeJson)?.error?.message || maybeJson; 
    } catch (_) {}
    throw new Error(`HTTP ${response.status}: ${detail}`);
  }

  return await response.json();
}

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} attempt - Current attempt number
 * @returns {Promise<any>} Function result
 */
async function retryWithBackoff(fn, attempt = 1) {
  try {
    return await fn();
  } catch (error) {
    // Don't retry on client errors (4xx)
    if (error.message.includes('400') || error.message.includes('401') || error.message.includes('403')) {
      throw error;
    }

    // Don't retry if we've exceeded max retries
    if (attempt >= RETRY_CONFIG.maxRetries) {
      throw error;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      RETRY_CONFIG.baseDelay * Math.pow(2, attempt - 1),
      RETRY_CONFIG.maxDelay
    );

    // Add some jitter to prevent thundering herd
    const jitter = Math.random() * 200;
    const totalDelay = delay + jitter;

    console.log(`Gemini API request failed, retrying in ${Math.round(totalDelay)}ms (attempt ${attempt}/${RETRY_CONFIG.maxRetries})`);

    await new Promise(resolve => setTimeout(resolve, totalDelay));
    return await retryWithBackoff(fn, attempt + 1);
  }
}

/**
 * Parse Gemini API response to extract text content
 * @param {Object} response - Raw API response from Gemini
 * @returns {string} Extracted text content
 */
export function parseGeminiResponse(response) {
  try {
    if (!response || !response.candidates || !Array.isArray(response.candidates)) {
      throw new Error('Invalid response format: missing candidates array');
    }

    if (response.candidates.length === 0) {
      throw new Error('No response generated');
    }

    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts || !Array.isArray(candidate.content.parts)) {
      throw new Error('Invalid candidate format: missing content parts');
    }

    if (candidate.content.parts.length === 0) {
      throw new Error('No content parts in response');
    }

    const textPart = candidate.content.parts[0];
    if (!textPart.text) {
      throw new Error('No text content in response part');
    }

    return textPart.text;
  } catch (error) {
    console.error('Failed to parse Gemini response:', error, response);
    throw new Error(`Failed to parse response: ${error.message}`);
  }
}

/**
 * Validate API key format (basic validation)
 * @param {string} apiKey - API key to validate
 * @returns {boolean} Whether the API key appears valid
 */
export function validateApiKey(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  // Basic validation: should be a non-empty string
  // Gemini API keys are typically long alphanumeric strings
  return apiKey.trim().length > 0;
}

/**
 * Test API key by making a simple request
 * @param {string} apiKey - API key to test
 * @returns {Promise<boolean>} Whether the API key is valid
 */
export async function testApiKey(apiKey) {
  try {
    const testContents = [{
      parts: [{ text: "Hello, please respond with just 'OK' if you can see this message." }]
    }];
    
    const response = await callGemini({
      apiKey,
      contents: testContents
    });
    
    const text = parseGeminiResponse(response);
    return text.toLowerCase().includes('ok');
  } catch (error) {
    console.error('API key test failed:', error);
    return false;
  }
}
