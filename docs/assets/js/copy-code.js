document.addEventListener('DOMContentLoaded', function() {
  var codeBlocks = document.querySelectorAll('pre');

  codeBlocks.forEach(function(pre) {
    // Skip mermaid blocks
    if (pre.querySelector('.mermaid') || pre.closest('.mermaid')) return;
    // Skip if already wrapped
    if (pre.parentElement.classList.contains('code-block-wrapper')) return;

    // Create wrapper
    var wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    // Create copy button
    var button = document.createElement('button');
    button.className = 'copy-button';
    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
    button.setAttribute('aria-label', 'Copy code');
    button.setAttribute('title', 'Copy to clipboard');

    button.addEventListener('click', function() {
      var code = pre.querySelector('code');
      var text = code ? code.textContent : pre.textContent;

      navigator.clipboard.writeText(text).then(function() {
        button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        button.classList.add('copied');

        setTimeout(function() {
          button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
          button.classList.remove('copied');
        }, 2000);
      });
    });

    wrapper.appendChild(button);
  });
});
