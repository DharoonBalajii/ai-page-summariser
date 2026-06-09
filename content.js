function extractPageContent() {
  const clone = document.body.cloneNode(true);

  const unwanted = clone.querySelectorAll(
    'script, style, noscript, nav, footer, header, iframe'
  );
  unwanted.forEach(el => el.remove());

  let text = clone.innerText || clone.textContent || '';
  text = text.replace(/\s+/g, ' ').trim();
  text = text.slice(0, 3000);

  return text; // ← just return it, no sendMessage needed
}

// Return the result directly
extractPageContent();