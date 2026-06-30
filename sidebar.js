document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const saveKeyBtn  = document.getElementById('save-key');
  const getHintBtn  = document.getElementById('get-hint');
  const resultDiv   = document.getElementById('result');
  const keySection  = document.getElementById('key-section');
  const keyToggle   = document.getElementById('key-toggle');
  const keyStatus   = document.getElementById('key-status');
  const resetBtn    = document.getElementById('reset-btn');
  const hintCounter = document.getElementById('hint-counter');

  // ── State ─────────────────────────────────────────────────
  let hintLevel   = 0;
  let problemText = '';
  let hintsGiven  = [];
  let isFetching  = false;

  const MAX_HINTS = 5;

  const HINT_LEVELS = [
    { label: 'Topic',       instruction: 'Name only the high-level algorithmic topic or data structure this problem falls under (e.g. "graph BFS", "binary search", "DP on intervals"). One sentence, no spoilers.' },
    { label: 'Observation', instruction: 'Give one key mathematical or structural observation about the problem that the solver needs to notice — without naming the algorithm or giving the approach. One sentence.' },
    { label: 'Approach',    instruction: 'Briefly describe the algorithmic approach at a high level (e.g. "model this as a shortest-path problem on a grid") without writing any pseudocode or revealing the implementation. 1–2 sentences.' },
    { label: 'Strategy',    instruction: 'Explain the core strategy and why it works, including the key invariant or recurrence if applicable. Still no code. 2–3 sentences.' },
    { label: 'Spoiler',     instruction: 'Give a near-complete solution sketch: the exact algorithm, data structures, complexity, and any tricky implementation details. This is the final hint — hold nothing back. 3–5 sentences.' },
  ];

  // ── UI helpers ────────────────────────────────────────────
  function setButtonState() {
    if (isFetching) {
      getHintBtn.disabled = true;
      getHintBtn.textContent = 'Thinking...';
      hintCounter.textContent = hintLevel > 0 ? `${hintLevel} / ${MAX_HINTS}` : '';
      return;
    }
    if (hintLevel === 0) {
      getHintBtn.disabled = false;
      getHintBtn.textContent = 'Get Hint';
      hintCounter.textContent = '';
    } else if (hintLevel >= MAX_HINTS) {
      getHintBtn.disabled = true;
      getHintBtn.textContent = 'No More Hints';
      hintCounter.textContent = `${MAX_HINTS} / ${MAX_HINTS}`;
    } else {
      getHintBtn.disabled = false;
      getHintBtn.textContent = 'Next Hint \u2192';
      hintCounter.textContent = `${hintLevel} / ${MAX_HINTS}`;
    }
  }

  function updatePips() {
    document.querySelectorAll('.pip').forEach((pip, i) => {
      pip.className = 'pip';
      if (i < hintLevel - 1)        pip.classList.add('done');
      else if (i === hintLevel - 1) pip.classList.add(hintLevel === MAX_HINTS ? 'final' : 'active');
    });
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderHints() {
    if (hintsGiven.length === 0) {
      resultDiv.innerHTML = '<span class="placeholder">Open a Codeforces problem, then click Get Hint.</span>';
      return;
    }

    let html = '';
    hintsGiven.forEach((text, i) => {
      const isLatest = i === hintsGiven.length - 1;
      html += `
        <div class="hint-card ${isLatest ? 'hint-latest' : 'hint-old'}">
          <div class="hint-meta">
            <span class="hint-num">#${i + 1}</span>
            <span class="hint-label">${HINT_LEVELS[i].label}</span>
          </div>
          <div class="hint-body" id="hint-body-${i}">${escapeHtml(text)}</div>
        </div>`;
    });

    if (isFetching) {
      const nextLevel = HINT_LEVELS[hintLevel];
      html += `
        <div class="hint-card hint-latest" id="loading-card">
          <div class="hint-meta">
            <span class="hint-num">#${hintLevel + 1}</span>
            <span class="hint-label">${nextLevel.label}</span>
          </div>
          <div class="loading-wrap">
            <div class="loading-text">Thinking<span class="cursor"></span></div>
            <div class="progress-bar"><div class="progress-fill"></div></div>
          </div>
        </div>`;
    }

    if (hintLevel >= MAX_HINTS && !isFetching) {
      html += `<div class="hint-exhausted">No more hints. Time to check the editorial!</div>`;
    }

    resultDiv.innerHTML = html;

    // Render KaTeX in each hint body
    hintsGiven.forEach((_, i) => {
      const el = document.getElementById(`hint-body-${i}`);
      if (el) {
        renderMathInElement(el, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '\\[', right: '\\]', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false },
          ],
          throwOnError: false
        });
      }
    });

    resultDiv.scrollTop = resultDiv.scrollHeight;
  }

  function refresh() {
    renderHints();
    setButtonState();
    updatePips();
  }

  // ── API key ───────────────────────────────────────────────
  keyToggle.addEventListener('click', () => {
    const hidden = keySection.classList.toggle('hidden');
    keyToggle.textContent = hidden ? 'API Key' : 'Close';
  });

  chrome.storage.local.get(['geminiApiKey'], (res) => {
    if (res.geminiApiKey) {
      apiKeyInput.value = res.geminiApiKey;
      keyStatus.classList.add('visible');
    }
  });

  saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (!key) return;
    chrome.storage.local.set({ geminiApiKey: key }, () => {
      keyStatus.classList.add('visible');
      setTimeout(() => {
        keySection.classList.add('hidden');
        keyToggle.textContent = 'API Key';
      }, 800);
    });
  });

  // ── Reset ─────────────────────────────────────────────────
  resetBtn.addEventListener('click', () => {
    if (isFetching) return;
    hintLevel   = 0;
    problemText = '';
    hintsGiven  = [];
    refresh();
  });

  // ── Get / Next Hint ───────────────────────────────────────
  getHintBtn.addEventListener('click', async () => {
    if (isFetching || hintLevel >= MAX_HINTS) return;

    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      keySection.classList.remove('hidden');
      keyToggle.textContent = 'Close';
      return;
    }

    // First hint: scrape the problem
    if (hintLevel === 0) {
      const scraped = await scrapeProblem();
      if (!scraped) return;
      problemText = scraped;
    }

    isFetching = true;
    refresh();

    await fetchNextHint(apiKey);
  });

  // ── Scraper ───────────────────────────────────────────────
  function scrapeProblem() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab || !tab.url.includes('codeforces.com')) {
          resultDiv.innerHTML = '<span class="error-text">Navigate to a Codeforces problem page first.</span>';
          resolve(null);
          return;
        }
        chrome.scripting.executeScript(
          { target: { tabId: tab.id }, func: _scrapeDOM },
          (results) => {
            if (!results || !results[0] || !results[0].result) {
              resultDiv.innerHTML = '<span class="error-text">Could not read the page. Refresh and try again.</span>';
              resolve(null);
              return;
            }
            const text = results[0].result;
            if (text.startsWith('Error:')) {
              resultDiv.innerHTML = `<span class="error-text">${text}</span>`;
              resolve(null);
            } else {
              resolve(text);
            }
          }
        );
      });
    });
  }

  function _scrapeDOM() {
    const node = document.querySelector('.problem-statement');
    if (!node) return 'Error: Problem statement not found. Make sure you are on a specific problem page.';
    let text = node.innerText;
    if (text.length > 4000) text = text.substring(0, 4000) + '\n\n...[truncated]...';
    return text;
  }

  // ── Gemini call ───────────────────────────────────────────
  async function fetchNextHint(apiKey) {
    const level = HINT_LEVELS[hintLevel];

    const systemPrompt = `You are a competitive programming coach helping a student solve a Codeforces problem step by step. Give hints one at a time, each progressively more revealing. Never repeat information from previous hints. Be concise.

Problem Statement:
${problemText}`;

    const messages = [];
    hintsGiven.forEach((hint, i) => {
      messages.push({ role: 'user',  parts: [{ text: `Hint #${i + 1}: ${HINT_LEVELS[i].instruction}` }] });
      messages.push({ role: 'model', parts: [{ text: hint }] });
    });
    messages.push({ role: 'user', parts: [{ text: `Hint #${hintLevel + 1}: ${level.instruction}` }] });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: messages,
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      if (data.error) throw new Error(`API Error: ${data.error.message}`);

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Unexpected response format from Gemini.');

      hintsGiven.push(text);
      hintLevel++;

    } catch (err) {
      const msg = err.name === 'AbortError'
        ? 'Request timed out after 20s. Try again.'
        : err.message;
      // Show error appended after existing cards
      hintsGiven; // keep existing hints intact
      isFetching = false;
      refresh();
      const errEl = document.createElement('div');
      errEl.className = 'error-text';
      errEl.textContent = msg;
      resultDiv.appendChild(errEl);
      resultDiv.scrollTop = resultDiv.scrollHeight;
      return;
    }

    isFetching = false;
    refresh();
  }

  // ── Init ──────────────────────────────────────────────────
  refresh();
});