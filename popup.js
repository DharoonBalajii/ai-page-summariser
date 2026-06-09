const apiKeyInput = document.getElementById('apiKeyInput');
const saveBtn = document.getElementById('saveBtn');
const statusMsg = document.getElementById('statusMsg');
const summariseBtn = document.getElementById('summariseBtn');
const studioLink = document.getElementById('studioLink');
const output = document.getElementById('output');
const summaryText = document.getElementById('summaryText');

// Open Google AI Studio in a new tab
studioLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://aistudio.google.com/app/apikey' });
});

// On popup open — check if API key is already saved
chrome.storage.local.get('geminiApiKey', (result) => {
  if (result.geminiApiKey) {
    statusMsg.textContent = '✅ API key saved!';
    summariseBtn.disabled = false;
  }
});

// Save API key
saveBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();

  if (!key) {
    statusMsg.style.color = '#e57373';
    statusMsg.textContent = '⚠️ Please paste an API key first.';
    return;
  }

  chrome.storage.local.set({ geminiApiKey: key }, () => {
    statusMsg.style.color = '#4caf50';
    statusMsg.textContent = '✅ API key saved!';
    summariseBtn.disabled = false;
    apiKeyInput.value = '';
  });
});

// Call Gemini API
async function callGemini(apiKey, pageText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [{
      parts: [{
        text: `Summarise the following webpage content perfectly with clear bullet points. Afterwards, provide an attractive and engaging short summarisation at the end. Format your ENTIRE response using standard HTML tags (like <ul>, <li>, <strong>, <h3>, <p>) so it can be directly rendered in a browser. Do NOT wrap your response in markdown code blocks. Make the summary look beautiful! Here is the content:\n\n${pageText}`
      }]
    }]
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'API request failed');
  }

  if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
    throw new Error('No summary generated. The content might have been blocked by safety settings or the model returned empty.');
  }

  // Extract the text from Gemini's response
  let resultHtml = data.candidates[0].content.parts[0].text;
  
  // Clean up any accidental markdown wrappers the model might add
  resultHtml = resultHtml.replace(/```html/gi, '').replace(/```/g, '').trim();

  return resultHtml;
}

// Summarise button
summariseBtn.addEventListener('click', () => {
  summariseBtn.textContent = '⏳ Reading page...';
  summariseBtn.disabled = true;
  output.style.display = 'none';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ['content.js']
    }, async (results) => {
      const pageText = results[0].result;

      if (!pageText || pageText.length < 50) {
        summaryText.textContent = '⚠️ Could not read enough content from this page.';
        output.style.display = 'block';
        summariseBtn.textContent = '⚡ Summarise This Page';
        summariseBtn.disabled = false;
        return;
      }

      // Got the text — now call Gemini!
      summariseBtn.textContent = '🤖 Asking Gemini...';

      chrome.storage.local.get('geminiApiKey', async (result) => {
        try {
          const summary = await callGemini(result.geminiApiKey, pageText);
          summaryText.innerHTML = summary; // Render the HTML formatting
          output.style.display = 'block';
        } catch (err) {
          summaryText.textContent = '❌ Error: ' + err.message;
          output.style.display = 'block';
        }

        summariseBtn.textContent = '⚡ Summarise This Page';
        summariseBtn.disabled = false;
      });
    });
  });
});