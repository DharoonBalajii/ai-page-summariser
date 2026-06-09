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