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

// Summarise button — inject content.js and get page text
summariseBtn.addEventListener('click', () => {
  summariseBtn.textContent = '⏳ Reading page...';
  summariseBtn.disabled = true;
  output.style.display = 'none';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ['content.js']
    }, (results) => {
      const pageText = results[0].result;

      if (!pageText || pageText.length < 50) {
        summaryText.textContent = '⚠️ Could not read enough content from this page.';
        output.style.display = 'block';
        summariseBtn.textContent = '⚡ Summarise This Page';
        summariseBtn.disabled = false;
        return;
      }

      // ✅ Got the text!
      summaryText.textContent = '✅ Page content grabbed! (' + pageText.length + ' characters)';
      output.style.display = 'block';
      summariseBtn.textContent = '⚡ Summarise This Page';
      summariseBtn.disabled = false;
    });
  });
});