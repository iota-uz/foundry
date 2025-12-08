document.addEventListener('DOMContentLoaded', function() {
  var button = document.querySelector('.copy-page-button');
  if (!button) return;

  var copyIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
  var checkIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

  var iconContainer = button.querySelector('svg');
  var textSpan = button.querySelector('span');

  button.addEventListener('click', function() {
    var content = document.querySelector('.main-content');
    if (!content) return;

    var markdown = convertToMarkdown(content);

    navigator.clipboard.writeText(markdown).then(function() {
      iconContainer.outerHTML = checkIcon;
      textSpan.textContent = 'Copied!';
      button.classList.add('copied');
      button.setAttribute('aria-label', 'Copied to clipboard');

      setTimeout(function() {
        button.querySelector('svg').outerHTML = copyIcon;
        textSpan.textContent = 'Copy page';
        button.classList.remove('copied');
        button.setAttribute('aria-label', 'Copy page as markdown');
      }, 2000);
    });
  });

  function convertToMarkdown(container) {
    var result = [];
    var title = container.querySelector('#title h1');
    if (title) {
      result.push('# ' + title.textContent.trim());
      result.push('');
    }

    var description = container.querySelector('#title > p');
    if (description) {
      result.push(description.textContent.trim());
      result.push('');
    }

    // Process content after #title, excluding footer
    var children = Array.from(container.children);
    children.forEach(function(child) {
      if (child.id === 'title' || child.tagName === 'FOOTER') return;
      result.push(processNode(child));
    });

    return result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    var tag = node.tagName.toLowerCase();

    // Skip certain elements
    if (tag === 'script' || tag === 'style' || tag === 'footer') {
      return '';
    }

    // Skip copy buttons and mermaid diagrams
    if (node.classList.contains('copy-button') ||
        node.classList.contains('copy-page-button') ||
        node.classList.contains('mermaid') ||
        node.classList.contains('code-block-wrapper')) {
      // For code-block-wrapper, process the pre inside
      if (node.classList.contains('code-block-wrapper')) {
        var pre = node.querySelector('pre');
        if (pre) return processNode(pre);
      }
      if (node.classList.contains('mermaid')) {
        return '\n```mermaid\n' + node.textContent.trim() + '\n```\n';
      }
      return '';
    }

    switch (tag) {
      case 'h1':
        return '\n# ' + getTextContent(node) + '\n';
      case 'h2':
        return '\n## ' + getTextContent(node) + '\n';
      case 'h3':
        return '\n### ' + getTextContent(node) + '\n';
      case 'h4':
        return '\n#### ' + getTextContent(node) + '\n';
      case 'h5':
        return '\n##### ' + getTextContent(node) + '\n';
      case 'h6':
        return '\n###### ' + getTextContent(node) + '\n';

      case 'p':
        return '\n' + processChildren(node) + '\n';

      case 'br':
        return '\n';

      case 'hr':
        return '\n---\n';

      case 'strong':
      case 'b':
        return '**' + processChildren(node) + '**';

      case 'em':
      case 'i':
        return '*' + processChildren(node) + '*';

      case 'code':
        // Check if inside pre (code block) or inline
        if (node.parentElement && node.parentElement.tagName.toLowerCase() === 'pre') {
          var lang = '';
          var classes = node.className.split(' ');
          classes.forEach(function(cls) {
            if (cls.startsWith('language-')) {
              lang = cls.replace('language-', '');
            }
          });
          return '```' + lang + '\n' + node.textContent + '```';
        }
        return '`' + node.textContent + '`';

      case 'pre':
        var codeEl = node.querySelector('code');
        if (codeEl) {
          return '\n' + processNode(codeEl) + '\n';
        }
        return '\n```\n' + node.textContent + '\n```\n';

      case 'a':
        var href = node.getAttribute('href') || '';
        var text = processChildren(node);
        if (href && text) {
          return '[' + text + '](' + href + ')';
        }
        return text;

      case 'img':
        var alt = node.getAttribute('alt') || '';
        var src = node.getAttribute('src') || '';
        return '![' + alt + '](' + src + ')';

      case 'ul':
        return '\n' + processListItems(node, '-') + '\n';

      case 'ol':
        return '\n' + processListItems(node, '1.') + '\n';

      case 'li':
        return processChildren(node);

      case 'blockquote':
        var lines = processChildren(node).trim().split('\n');
        return '\n' + lines.map(function(line) { return '> ' + line; }).join('\n') + '\n';

      case 'table':
        return '\n' + processTable(node) + '\n';

      case 'div':
      case 'section':
      case 'article':
      case 'span':
        return processChildren(node);

      default:
        return processChildren(node);
    }
  }

  function processChildren(node) {
    var result = '';
    node.childNodes.forEach(function(child) {
      result += processNode(child);
    });
    return result;
  }

  function getTextContent(node) {
    return node.textContent.trim();
  }

  function processListItems(list, marker) {
    var items = [];
    var children = Array.from(list.children);
    children.forEach(function(child, index) {
      if (child.tagName.toLowerCase() === 'li') {
        var prefix = marker === '1.' ? (index + 1) + '.' : marker;
        var content = processChildren(child).trim().replace(/\n/g, '\n  ');
        items.push(prefix + ' ' + content);
      }
    });
    return items.join('\n');
  }

  function processTable(table) {
    var rows = [];
    var headerProcessed = false;

    var thead = table.querySelector('thead');
    var tbody = table.querySelector('tbody');

    // Process header
    if (thead) {
      var headerRow = thead.querySelector('tr');
      if (headerRow) {
        var headerCells = Array.from(headerRow.querySelectorAll('th, td'));
        var headers = headerCells.map(function(cell) {
          return processChildren(cell).trim();
        });
        rows.push('| ' + headers.join(' | ') + ' |');
        rows.push('| ' + headers.map(function() { return '---'; }).join(' | ') + ' |');
        headerProcessed = true;
      }
    }

    // Process body rows
    var bodyRows = tbody ? tbody.querySelectorAll('tr') : table.querySelectorAll('tr');
    bodyRows.forEach(function(row, index) {
      var cells = Array.from(row.querySelectorAll('th, td'));
      var values = cells.map(function(cell) {
        return processChildren(cell).trim().replace(/\|/g, '\\|');
      });

      // If no thead, first row becomes header
      if (!headerProcessed && index === 0) {
        rows.push('| ' + values.join(' | ') + ' |');
        rows.push('| ' + values.map(function() { return '---'; }).join(' | ') + ' |');
        headerProcessed = true;
      } else {
        rows.push('| ' + values.join(' | ') + ' |');
      }
    });

    return rows.join('\n');
  }
});
