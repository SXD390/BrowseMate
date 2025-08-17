// Gemini API integration for Cedric AI Side Panel
// Handles API calls to Google's Gemini model with proper error handling

const GEMINI_API_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const DEFAULT_GENERATION_CONFIG = { thinkingConfig: { thinkingBudget: 0 } };

// Return N best 1KB windows around query terms (CK_LOCKMUTEX, etc.)
function pickRelevantSnippets(query, markdown, {
  perHitChars = 1000,
  maxChars = 6000
} = {}) {
  if (!markdown) return '';
  
  const terms = (query.toLowerCase().match(/\b[\w.-]{3,}\b/g) || [])
    .slice(0, 12); // cap terms
  
  if (!terms.length) return markdown.slice(0, maxChars);

  const text = markdown;
  const lc = markdown.toLowerCase();
  const hits = [];
  
  for (const term of terms) {
    let idx = 0;
    while ((idx = lc.indexOf(term, idx)) !== -1) {
      const start = Math.max(0, idx - Math.floor(perHitChars/2));
      const end = Math.min(text.length, idx + term.length + Math.floor(perHitChars/2));
      hits.push([start, end]);
      idx += term.length;
    }
  }
  
  if (!hits.length) return markdown.slice(0, maxChars);

  // merge overlapping windows
  hits.sort((a,b) => a[0]-b[0]);
  const merged = [];
  
  for (const h of hits) {
    const last = merged[merged.length-1];
    if (!last || h[0] > last[1] + 50) {
      merged.push(h);
    } else {
      last[1] = Math.max(last[1], h[1]);
    }
  }

  let out = '';
  for (const [s,e] of merged) {
    if (out.length >= maxChars) break;
    out += text.slice(s, Math.min(e, s + perHitChars)) + '\n...\n';
  }
  
  return out.slice(0, maxChars);
}

export function compileMessagesForGemini(messages, settings = {}) {
  const systemInstruction = {
    parts: [{
      text: [
        "You are BrowseMate, a fast, reliable chat agent that runs inside a web browser.",
        "Inputs you receive:",
        "1) prior chat turns, 2) the user's current prompt, and 3) PAGE CONTEXT blocks from ingested webpages.",
        "Guidelines:",
        "- Prefer facts from relevant PAGE CONTEXT blocks and cite their domain/title inline.",
        "- If contexts conflict, explain the divergence and prefer the most specific, recent source.",
        "- Summaries should be concise and structured; use bullets/tables when useful.",
        "- Format code with fenced blocks. Do not invent content or URLs.",
        "- If PAGE CONTEXT is irrelevant, answer normally."
      ].join('\n')
    }]
  };

  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  const query = lastUser?.text || '';

  // Build role-tagged history
  const MAX_TURNS = 8;
  const chatTurns = messages.filter(m => m.role === 'user' || m.role === 'model').slice(-MAX_TURNS);

  const contextMsgs = messages.filter(m => m.role === 'context');
  const MAX_CONTEXT = 5;
  const contexts = contextMsgs.slice(-MAX_CONTEXT).map(m => {
    // Prefer query-aware slices from full markdown; fallback to essential
    const excerpt = m.markdown
      ? pickRelevantSnippets(query, m.markdown, { perHitChars: 1200, maxChars: 6000 })
      : (m.essentialMarkdown || '').slice(0, 6000);

    const hdr = `PAGE CONTEXT — ${m.title || 'Untitled'} (${m.url || ''}) — captured ${m.timestamp || ''}`;
    return { role: 'user', parts: [{ text: `${hdr}\n\n${excerpt}` }] };
  });

  const history = chatTurns.map(m => ({
    role: m.role,
    parts: [{ text: m.text }]
  }));

  return { contents: [...contexts, ...history], systemInstruction };
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
    console.log("Calling Gemini API with below contents: ", contents);
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
  // Log the request being sent to Gemini
  console.log('🤖 Sending request to Gemini:', {
    url: GEMINI_API_ENDPOINT,
    contents: contents.map(c => ({
      role: c.role,
      textLength: c.parts?.[0]?.text?.length || 0,
      text: c.parts?.[0]?.text
    })),
    systemInstruction: systemInstruction?.parts?.[0]?.text,
    generationConfig
  });

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
