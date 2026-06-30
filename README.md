# Codeforces AI Coach

A Chrome extension that gives you progressive, AI-powered hints for Codeforces problems — without spoiling the solution. Powered by Google Gemini and rendered with KaTeX for clean math output.

---

## How It Works

Open any Codeforces problem and click **Get Hint**. The extension scrapes the problem statement and sends it to Gemini, which returns a hint calibrated to your current level of revealed information. Each subsequent hint goes one step deeper:

| # | Level | What it reveals |
|---|-------|----------------|
| 1 | **Topic** | The algorithmic category (e.g. "binary search", "graph BFS") |
| 2 | **Observation** | A key structural insight you need to notice |
| 3 | **Approach** | The high-level strategy, no code |
| 4 | **Strategy** | Core logic, invariants, and recurrences |
| 5 | **Spoiler** | Full solution sketch with complexity |

Previous hints stay visible but fade out, keeping the focus on the latest one. A 5-pip progress bar in the header tracks how deep you've gone.

---

## Features

- **Progressive hints** — 5 levels, each strictly more revealing than the last
- **Conversation memory** — Gemini sees all previous hints, so it never repeats itself
- **Math rendering** — KaTeX renders any LaTeX in hints beautifully inline
- **Persistent API key** — saved to `chrome.storage.local`, never leaves your browser
- **Reset anytime** — clear the session and start fresh for a new problem
- **15-second timeout** — won't hang forever if the API is slow

---

## Installation

This extension is not on the Chrome Web Store. Load it manually as an unpacked extension.

**1. Clone the repo**
```bash
git clone https://github.com/your-username/codeforces-ai-coach.git
```

**2. Open Chrome Extensions**

Go to `chrome://extensions` and enable **Developer mode** (top-right toggle).

**3. Load the extension**

Click **Load unpacked** and select the cloned folder.

**4. Get a Gemini API key**

Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and generate a free API key.

**5. Add your key**

Click the extension icon in the toolbar to open the sidebar. Click **API Key**, paste your key, and hit **Save**.

---

## Usage

1. Navigate to any problem page on [codeforces.com](https://codeforces.com) (e.g. `codeforces.com/problemset/problem/1/A`)
2. Open the sidebar by clicking the **CF Coach** icon in the Chrome toolbar
3. Click **Get Hint**
4. If you're still stuck, click **Next Hint →** for a deeper nudge
5. Hit the **↺ reset** button when moving to a new problem

---

## File Structure

```
codeforces-ai-coach/
├── manifest.json        # Chrome extension manifest (v3)
├── background.js        # Opens the side panel on icon click
├── sidebar.html         # Extension UI
├── sidebar.js           # All logic — scraping, state, Gemini API calls
├── katex.min.js         # KaTeX math renderer
├── katex.min.css        # KaTeX styles
└── auto-render.min.js   # KaTeX auto-render helper
```

---

## Tech Stack

- **Chrome Extensions Manifest V3** — Side Panel API, Scripting API, Storage API
- **Google Gemini** (`gemini-2.5-flash-lite`) — fast, low-cost inference
- **KaTeX** — client-side LaTeX math rendering
- **Vanilla JS** — no build step, no dependencies

---

## Notes

- The extension only activates on `*.codeforces.com` pages
- Problem text is truncated to 4,000 characters before being sent to the API
- Your API key is stored locally in Chrome and is never sent anywhere except Google's API
- This project uses Gemini's free tier — standard rate limits apply


