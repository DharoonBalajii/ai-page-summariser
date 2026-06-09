chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarise_selection",
    title: "✨ Summarise with AI",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "summarise_selection") {
    const selectedText = info.selectionText;

    // Send a message to content.js to show loading state
    chrome.tabs.sendMessage(tab.id, { action: "show_summary_loading" });

    // Call Gemini API
    chrome.storage.local.get('geminiApiKey', async (result) => {
      const apiKey = result.geminiApiKey;
      if (!apiKey) {
        chrome.tabs.sendMessage(tab.id, { action: "show_summary_error", error: "Please save your API key in the extension popup first." });
        return;
      }

      try {
        // Fetch valid models
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        
        let modelName = 'gemini-1.5-flash';
        if (response.ok) {
           const validModels = data.models.filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'));
           const modelNames = validModels.map(m => m.name.replace('models/', ''));
           const prefs = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash-001', 'gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-pro'];
           for (const pref of prefs) {
             if (modelNames.includes(pref)) { modelName = pref; break; }
           }
        }

        const apiURL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const body = {
          contents: [{
            parts: [{
              text: `Summarize the following highlighted text concisely and perfectly. Format your ENTIRE response using standard HTML tags (like <ul>, <li>, <strong>, <p>) so it can be directly rendered in a browser. Do NOT wrap your response in markdown code blocks. Make it look beautiful! Here is the content:\n\n${selectedText}`
            }]
          }]
        };

        const res = await fetch(apiURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        const resData = await res.json();
        
        if (!res.ok) {
          throw new Error(resData.error?.message || 'API request failed');
        }
        
        if (!resData.candidates || resData.candidates.length === 0) {
          throw new Error('No summary generated.');
        }

        let summaryHtml = resData.candidates[0].content.parts[0].text;
        summaryHtml = summaryHtml.replace(/```html/gi, '').replace(/```/g, '').trim();

        chrome.tabs.sendMessage(tab.id, { action: "show_summary_result", summary: summaryHtml });

      } catch (err) {
        chrome.tabs.sendMessage(tab.id, { action: "show_summary_error", error: err.message });
      }
    });
  }
});
