// Initialize global state only once to avoid duplicate event listeners or syntax errors on multiple injections
if (!window.aiSummariserInitialized) {
  window.aiSummariserInitialized = true;
  window.floatingCard = null;

  window.showFloatingCard = function(contentHtml, isHtml = false) {
    if (!window.floatingCard) {
      window.floatingCard = document.createElement('div');
      window.floatingCard.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 350px;
        max-height: 400px;
        overflow-y: auto;
        background: #1a1a1a;
        color: #e0e0e0;
        border: 1px solid #333;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.6);
        z-index: 999999;
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 14px;
        line-height: 1.6;
      `;
      
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✖';
      closeBtn.style.cssText = `
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        font-size: 14px;
      `;
      closeBtn.onclick = () => {
        window.floatingCard.remove();
        window.floatingCard = null;
      };
      window.floatingCard.appendChild(closeBtn);

      const title = document.createElement('div');
      title.textContent = '✨ AI Summary';
      title.style.cssText = `
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 12px;
        color: #fff;
        border-bottom: 1px solid #333;
        padding-bottom: 8px;
      `;
      window.floatingCard.appendChild(title);

      const contentDiv = document.createElement('div');
      contentDiv.id = 'ai-summary-content';
      window.floatingCard.appendChild(contentDiv);
      
      document.body.appendChild(window.floatingCard);
    }

    const contentDiv = window.floatingCard.querySelector('#ai-summary-content');
    if (isHtml) {
      contentDiv.innerHTML = contentHtml;
      const uls = contentDiv.querySelectorAll('ul');
      uls.forEach(ul => { ul.style.marginLeft = '20px'; ul.style.marginBottom = '12px'; });
      const lis = contentDiv.querySelectorAll('li');
      lis.forEach(li => { li.style.marginBottom = '8px'; li.style.color = '#d4d4d4'; });
      const strongs = contentDiv.querySelectorAll('strong');
      strongs.forEach(s => { s.style.color = '#7ab3ef'; });
      const h3s = contentDiv.querySelectorAll('h3, h4');
      h3s.forEach(h => { h.style.color = '#4f8ef7'; h.style.marginTop = '12px'; h.style.marginBottom = '8px'; h.style.fontSize = '15px'; });
    } else {
      contentDiv.textContent = contentHtml;
    }
  };

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "show_summary_loading") {
      window.showFloatingCard("⏳ AI is reading the highlighted text...");
    } else if (request.action === "show_summary_result") {
      window.showFloatingCard(request.summary, true);
    } else if (request.action === "show_summary_error") {
      window.showFloatingCard("❌ Error: " + request.error, true);
    }
  });
}

// Extract page content safely in an IIFE so it returns directly to popup.js
(function extractPageContent() {
  let text = document.body.innerText || document.body.textContent || '';
  
  const images = document.querySelectorAll('img');
  let imageDescriptions = [];
  images.forEach(img => {
    if (img.alt && img.alt.trim() !== '') {
      imageDescriptions.push(`[Image: ${img.alt.trim()}]`);
    }
  });

  if (imageDescriptions.length > 0) {
    text += "\n\n--- Visuals on this page ---\n" + imageDescriptions.join("\n");
  }

  text = text.replace(/\s+/g, ' ').trim();
  text = text.slice(0, 50000);

  return text;
})();