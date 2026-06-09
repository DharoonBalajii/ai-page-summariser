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

      const modelsToTry = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-1.5-flash-8b',
        'gemini-pro',
        'gemini-1.0-pro'
      ];

      const body = {
        contents: [{
          parts: [{
            text: `Summarize the following highlighted text concisely and perfectly. Format your ENTIRE response using standard HTML tags (like <ul>, <li>, <strong>, <p>) so it can be directly rendered in a browser. Do NOT wrap your response in markdown code blocks. Make it look beautiful! Here is the content:\n\n${selectedText}`
          }]
        }]
      };

      let success = false;
      let lastError = 'Unknown error';

      for (const model of modelsToTry) {
        const apiURL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        try {
          const res = await fetch(apiURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          const resData = await res.json();
          
          if (res.ok && resData.candidates && resData.candidates.length > 0) {
            let summaryHtml = resData.candidates[0].content.parts[0].text;
            summaryHtml = summaryHtml.replace(/```html/gi, '').replace(/```/g, '').trim();
            chrome.tabs.sendMessage(tab.id, { action: "show_summary_result", summary: summaryHtml });
            success = true;
            break;
          }
          if (resData.error && resData.error.message) {
            lastError = resData.error.message;
          }
        } catch (err) {
          lastError = err.message;
        }
      }

      if (!success) {
        chrome.tabs.sendMessage(tab.id, { action: "show_summary_error", error: `All models failed. Last error: ${lastError}` });
      }
    });
  }
});
