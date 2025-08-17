=# 🧭 BrowseMate — AI Side Panel (Chrome MV3)

> **A persistent, right-side panel that ingests webpages/PDFs, chats with Gemini, and renders beautiful Markdown answers.**

<p align="center">
  <img src="https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white" />
  <img src="https://img.shields.io/badge/LLM-Gemini%202.x%20Flash-7B73FF?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Context-Ingest%20Web+PDF-10B981?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Render-Markdown-9333EA?style=for-the-badge" />
</p>

---

## ✨ Features

* **Persistent Side Panel** — opens from the extensions toolbar and stays open across tab switches until you close it.
* **Gemini-Powered Chat** — all answers come from Gemini (2.0/2.5 Flash). System prompt tuned for in‑browser assistance.
* **Ingest Webpages & PDFs** — one‑click "Ingest this web page" captures HTML **and** PDFs (via pdf.js) as **Markdown**; deduped per session by URL.
* **Context-Aware Prompts** — RAG‑lite compiler sends relevant slices of ingested sources based on your current question.
* **Sessions** — multiple chat sessions with full turn history. Import/Export supported.
* **Markdown Answers** — responses render as sanitized Markdown (tables, lists, code blocks, links). Optional syntax highlighting.
* **Token Insights** — bottom‑right shows **overall tokens X / limit** using Gemini’s `:countTokens`. Left chip shows draft input tokens.
* **Sources Tab** — view, open, or remove ingested URLs for the active session.
* **Keyboard UX** — ⌘/Ctrl+Enter to send; textarea auto‑sizes without hiding the Send button.
* **Privacy‑First** — no server; your API key and data live in Chrome storage.

---

## 🧩 Architecture

```
extension/
├── manifest.json           # MV3 + Side Panel + permissions
├── background.js           # registers side panel; message router
├── panel.html/.css/.js     # UI, sessions, tabs, composer, toasts
├── content.js              # DOM/PDF extraction → Markdown (+ essential slices)
├── gemini.js               # request compiler, countTokens, generateContent
├── storage.js              # namespaced SettingsStorage/SessionStorage
├── assets/                 # icons (16/48/128)
└── vendor/                 # marked, DOMPurify, highlight.js, pdfjs
```

**Key flows**

* **Ingest**: `panel.js` → `runtime.sendMessage(EXTRACT_CONTENT)` → `content.js` extracts (HTML→MD or PDF→MD) → session saves a `context` message (with `markdown` & `essentialMarkdown`).
* **Send**: `panel.js` compiles **systemInstruction + recent chat + query‑aware context slices** via `gemini.js` → calls `generateContent` → renders Markdown.
* **Tokens**: `panel.js` calls `countTokens` with the **exact payload** (including draft input) → updates `X / LIMIT` badge.

---

## 🚀 Quick Start

### 1) Get a Gemini API key

Create a key in Google AI Studio. Keep it private.

### 2) Install vendor files (no bundler required)

We vendor tiny client‑side libs for Markdown rendering and PDF text extraction.

**Node (macOS/Linux):**

```bash
npm i marked dompurify highlight.js pdfjs-dist --save-dev
mkdir -p extension/vendor/{marked,dompurify,highlightjs,pdfjs}
cp node_modules/marked/marked.min.js extension/vendor/marked/
cp node_modules/dompurify/dist/purify.min.js extension/vendor/dompurify/
cp node_modules/highlight.js/lib/common.min.js extension/vendor/highlightjs/highlight.min.js
cp node_modules/highlight.js/styles/github-dark.min.css extension/vendor/highlightjs/
cp node_modules/pdfjs-dist/build/pdf.mjs extension/vendor/pdfjs/pdf.mjs
cp node_modules/pdfjs-dist/build/pdf.worker.mjs extension/vendor/pdfjs/pdf.worker.mjs
```

**PowerShell (Windows):**

```powershell
npm i marked dompurify highlight.js pdfjs-dist --save-dev
New-Item -ItemType Directory extension/vendor/marked,extension/vendor/dompurify,extension/vendor/highlightjs,extension/vendor/pdfjs -Force | Out-Null
Copy-Item node_modules/marked/marked.min.js extension/vendor/marked/
Copy-Item node_modules/dompurify/dist/purify.min.js extension/vendor/dompurify/
Copy-Item node_modules/highlight.js/lib/common.min.js extension/vendor/highlightjs/highlight.min.js
Copy-Item node_modules/highlight.js/styles/github-dark.min.css extension/vendor/highlightjs/
Copy-Item node_modules/pdfjs-dist/build/pdf.mjs extension/vendor/pdfjs/pdf.mjs
Copy-Item node_modules/pdfjs-dist/build/pdf.worker.mjs extension/vendor/pdfjs/pdf.worker.mjs
```

> If you don’t need syntax highlighting, you can skip the `highlight.js` lines.

### 3) Load the extension

1. Visit `chrome://extensions` → toggle **Developer mode**.
2. Click **Load unpacked** → select the `extension/` folder.
3. Pin **BrowseMate** to your toolbar.

### 4) First‑run setup

* Click the icon → the side panel opens.
* Open **Settings** (gear) → paste your **Gemini API key**. Optionally pick a model ID (defaults to `models/gemini-2.0-flash`).

### 5) Use it

* **Chat:** type and press ⌘/Ctrl+Enter or **Send**.
* **Ingest:** click **Ingest this web page**. In PDFs, BrowseMate extracts the text via pdf.js.
* **Sources tab:** review ingested pages; open or remove them.
* **Tokens:** bottom‑right shows **overall X / LIMIT**; it updates live as you type or ingest.

---

## ⚙️ Configuration

Adjust these constants in code (search the file noted):

* **Default model** — `panel.js` / settings: `models/gemini-2.0-flash`
* **Token limits** — `panel.js` → `MODEL_TOKEN_LIMITS` (e.g., 1,048,576 for 2.0/2.5 Flash)
* **RAG‑lite window sizes** — `gemini.js` → `pickRelevantSnippets()` (`perHitChars`, `maxChars`)
* **Context caps** — `gemini.js` → `MAX_CONTEXT`, `MAX_TURNS`
* **Storage key prefix** — `storage.js` (defaults to `bm_*`, with migration from older `cedric_*` keys)

---

## 🛡️ Security & Privacy

* **No proxy server** — API calls are made directly to Google’s endpoint from the extension.
* **Local storage** — API key, sessions, and ingested content are stored in `chrome.storage.local`.
* **Sanitized HTML** — LLM Markdown is sanitized with **DOMPurify**. Links open with `rel="noopener noreferrer"`.
* **CSP‑friendly** — no inline scripts; vendor libraries load from the extension package.

---

## 🧠 System Prompt (summary)

> You are **BrowseMate**, a fast, reliable chat agent that runs inside a web browser. You receive prior chat turns, the current prompt, and optional **PAGE CONTEXT** blocks from ingested webpages/PDFs. Prefer facts from relevant contexts (cite source title/domain). If contexts conflict, note the divergence and prefer specific, recent sources. Be concise; use bullets/tables when helpful; format code with fenced blocks; don’t invent content/URLs. If context isn’t relevant, answer normally.

(See `gemini.js` for the exact `systemInstruction`.)

---

## 🔍 Token Accounting

* **Overall counter** uses the official `models:countTokens` endpoint with the **exact** payload that will be sent (system + contexts + history + draft input). Updates live while typing.
* **Draft counter** (left) is a light heuristic for the composer only.
* **Limits**: default map contains 1,048,576 tokens for Flash models; adjust if Google updates the limits.
* When nearing the limit (≥90%), the counter turns **amber**; at ≥100% it turns **red** and you should trim sources or reduce history.

---

## 🧪 Troubleshooting

* **Side panel doesn’t persist:** ensure Chrome supports the **Side Panel API**; update to the latest stable.
* **Invalid request / 4xx from Gemini:** verify API key, model ID, and that `contents` include at least one `user` role.
* **Token count fails:** we fall back to an approximate `chars ÷ 4`. Check DevTools → Console for the exact error.
* **PDF not extracted:** some domains block fetch. The extension fetches directly; if blocked, open the PDF in a new tab and try again.
* **Hit token limit:** open **Sources** and remove older pages; or reduce MAX\_TURNS / MAX\_CONTEXT in `gemini.js`.

---

## 📄 License

MIT — see `LICENSE`.
