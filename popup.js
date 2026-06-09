const apiKeyInput = document.getElementById('apiKeyInput');
const saveBtn = document.getElementById('saveBtn');
const statusMsg = document.getElementById('statusMsg');
const summariseBtn = document.getElementById('summariseBtn');
const studioLink = document.getElementById('studioLink');
const output = document.getElementById('output');
const summaryText = document.getElementById('summaryText');
const summaryStyle = document.getElementById('summaryStyle');
const timeSavedBanner = document.getElementById('timeSavedBanner');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const readAloudBtn = document.getElementById('readAloudBtn');

const chatInput = document.getElementById('chatInput');
const chatBtn = document.getElementById('chatBtn');
const chatHistory = document.getElementById('chatHistory');

let globalPageText = ''; // Store context for chat

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

// Core Engine with Automatic Retry
async function generateWithRetry(apiKey, body) {
  const modelsToTry = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-1.5-flash-8b',
    'gemini-pro',
    'gemini-1.0-pro'
  ];

  let lastError = 'Unknown error';
  
  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();

      if (response.ok && data.candidates && data.candidates.length > 0) {
        let resultHtml = data.candidates[0].content.parts[0].text;
        return resultHtml.replace(/```html/gi, '').replace(/```/g, '').trim();
      }
      
      if (data.error && data.error.message) {
        lastError = data.error.message;
      }
    } catch (e) {
      lastError = e.message;
    }
  }

  throw new Error(`All Gemini models failed. Last error: ${lastError}`);
}

// Call Gemini API
async function callGemini(apiKey, pageText, style) {
  let stylePrompt = "Summarise the following webpage content perfectly with clear bullet points.";
  if (style === 'tldr') stylePrompt = "Provide a very short, bare-minimum TL;DR of the following webpage content.";
  if (style === 'eli5') stylePrompt = "Explain the following webpage content simply, as if I were a 5-year-old child.";
  if (style === 'executive') stylePrompt = "Provide a formal, business-oriented Executive Summary of the following webpage content.";
  if (style === 'action_items') stylePrompt = "Extract a clear checklist of action items or next steps from the following webpage content.";

  const body = {
    contents: [{
      parts: [{
        text: `${stylePrompt} Afterwards, provide an attractive and engaging short summarisation at the end. Format your ENTIRE response using standard HTML tags (like <ul>, <li>, <strong>, <h3>, <p>) so it can be directly rendered in a browser. Do NOT wrap your response in markdown code blocks. Make the summary look beautiful! Here is the content:\n\n${pageText}`
      }]
    }]
  };

  return await generateWithRetry(apiKey, body);
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
      globalPageText = pageText; // Save for chat context

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
          const selectedStyle = summaryStyle.value;
          const summary = await callGemini(result.geminiApiKey, pageText, selectedStyle);
          
          summaryText.innerHTML = summary; // Render the HTML formatting
          output.style.display = 'block';

          // Calculate time saved (Average reading speed: 200 wpm)
          const wordCount = pageText.split(/\s+/).length;
          const readingTimeMinutes = Math.ceil(wordCount / 200);
          timeSavedBanner.textContent = `🎉 You just saved ~${readingTimeMinutes} minutes of reading!`;
          timeSavedBanner.style.display = 'block';

        } catch (err) {
          summaryText.textContent = '❌ Error: ' + err.message;
          output.style.display = 'block';
          timeSavedBanner.style.display = 'none';
        }

        summariseBtn.textContent = '⚡ Summarise This Page';
        summariseBtn.disabled = false;
      });
    });
  });
});

// --- Action Buttons Logic ---

// Copy to Clipboard
copyBtn.addEventListener('click', () => {
  const text = summaryText.innerText;
  navigator.clipboard.writeText(text).then(() => {
    copyBtn.textContent = '✅ Copied!';
    setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 2000);
  });
});

// Download as Text File
downloadBtn.addEventListener('click', () => {
  const text = summaryText.innerText;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'AI_Summary.txt';
  a.click();
  URL.revokeObjectURL(url);
});

// Read Aloud (Text-to-Speech)
let isSpeaking = false;
readAloudBtn.addEventListener('click', () => {
  if (isSpeaking) {
    speechSynthesis.cancel();
    isSpeaking = false;
    readAloudBtn.textContent = '🔊 Listen';
    readAloudBtn.classList.remove('active');
    return;
  }
  
  const text = summaryText.innerText;
  if (!text) return;

  const utterance = new SpeechSynthesisUtterance(text);
  
  utterance.onend = () => {
    isSpeaking = false;
    readAloudBtn.textContent = '🔊 Listen';
    readAloudBtn.classList.remove('active');
  };
  
  speechSynthesis.speak(utterance);
  isSpeaking = true;
  readAloudBtn.textContent = '⏹️ Stop';
  readAloudBtn.classList.add('active');
});

// --- Chat Logic ---

async function chatWithGemini(apiKey, pageText, question) {
  const body = {
    contents: [{
      parts: [{
        text: `You are an AI assistant helping the user understand a webpage. Based ONLY on the following webpage content, answer the user's question concisely. If the answer is not in the content, say so.\n\nContent:\n${pageText}\n\nQuestion: ${question}`
      }]
    }]
  };

  return await generateWithRetry(apiKey, body);
}

chatBtn.addEventListener('click', () => {
  const question = chatInput.value.trim();
  if (!question || !globalPageText) return;

  // Add user message to UI
  const userMsg = document.createElement('div');
  userMsg.className = 'chat-msg user';
  userMsg.textContent = question;
  chatHistory.appendChild(userMsg);
  
  chatInput.value = '';
  chatBtn.textContent = '...';
  chatBtn.disabled = true;

  chrome.storage.local.get('geminiApiKey', async (result) => {
    try {
      const answer = await chatWithGemini(result.geminiApiKey, globalPageText, question);
      
      const aiMsg = document.createElement('div');
      aiMsg.className = 'chat-msg ai';
      aiMsg.textContent = answer;
      chatHistory.appendChild(aiMsg);
      
      // Scroll to bottom
      const outputDiv = document.getElementById('output');
      outputDiv.scrollTop = outputDiv.scrollHeight;
    } catch (err) {
      const aiMsg = document.createElement('div');
      aiMsg.className = 'chat-msg ai';
      aiMsg.textContent = '❌ ' + err.message;
      chatHistory.appendChild(aiMsg);
    }
    
    chatBtn.textContent = 'Ask';
    chatBtn.disabled = false;
  });
});