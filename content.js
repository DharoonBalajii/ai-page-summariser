function extractPageContent() {
  // Prefer the main content area if available, otherwise use the body
  let mainElement = document.querySelector('article') || document.querySelector('main') || document.body;
  const clone = mainElement.cloneNode(true);

  // Remove common noisy elements like scripts, navbars, and footers
  const unwanted = clone.querySelectorAll(
    'script, style, noscript, nav, footer, header, iframe, aside, .sidebar, #sidebar'
  );
  unwanted.forEach(el => el.remove());

  // Extract alt text from images so the AI knows what's in the pictures!
  const images = clone.querySelectorAll('img');
  images.forEach(img => {
    if (img.alt && img.alt.trim() !== '') {
      const altText = document.createTextNode(` [Image: ${img.alt}] `);
      if (img.parentNode) {
        img.parentNode.replaceChild(altText, img);
      }
    } else {
      if (img.parentNode) img.remove(); // Remove images without alt text to save space
    }
  });

  let text = clone.innerText || clone.textContent || '';
  
  // Clean up extra whitespace and newlines
  text = text.replace(/\s+/g, ' ').trim();
  
  // Gemini 1.5+ has a massive context window. Send up to 50,000 characters.
  text = text.slice(0, 50000);

  return text;
}

// Return the result directly
extractPageContent();

// --- Message Listener for Right-Click Summaries ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "show_summary_loading") {
    showFloatingCard("⏳ AI is reading the highlighted text...");
  } else if (request.action === "show_summary_result") {
    showFloatingCard(request.summary, true);
  } else if (request.action === "show_summary_error") {
    showFloatingCard("❌ Error: " + request.error, true);
  }
});

let floatingCard = null;

function showFloatingCard(contentHtml, isHtml = false) {
  if (!floatingCard) {
    floatingCard = document.createElement('div');
    floatingCard.style.cssText = `
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
    
    // Create close button
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
      floatingCard.remove();
      floatingCard = null;
    };
    floatingCard.appendChild(closeBtn);

    // Title
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
    floatingCard.appendChild(title);

    const contentDiv = document.createElement('div');
    contentDiv.id = 'ai-summary-content';
    floatingCard.appendChild(contentDiv);
    
    document.body.appendChild(floatingCard);
  }

  const contentDiv = floatingCard.querySelector('#ai-summary-content');
  if (isHtml) {
    contentDiv.innerHTML = contentHtml;
    // Apply basic styling to injected HTML elements
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
}