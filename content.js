// Runs inside the actual webpage
// Grabs all readable text and sends it back to popup.js

function extractPageContent() {
  // Clone the page so we don't mess with what's visible
  const clone = document.body.cloneNode(true);

  // Remove junk elements
  const unwanted = clone.querySelectorAll(
    'script, style, noscript, nav, footer, header, iframe'
  );
  unwanted.forEach(el => el.remove());

  // Get clean text
  let text = clone.innerText || clone.textContent || '';

  // Collapse whitespace and limit to 3000 chars (safe for Gemini)
  text = text.replace(/\s+/g, ' ').trim();
  text = text.slice(0, 3000);

  return text;
}

const pageContent = extractPageContent();
chrome.runtime.sendMessage({ type: 'PAGE_CONTENT', content: pageContent });
