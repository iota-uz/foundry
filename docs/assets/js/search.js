(function() {
  var searchIndex = null;
  var searchData = null;
  var selectedIndex = -1;

  // Load search data
  function loadSearchData() {
    if (searchData) return Promise.resolve();

    var baseUrl = document.querySelector('link[rel="stylesheet"]').href;
    var searchUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/assets/')) + '/search.json';

    return fetch(searchUrl)
      .then(function(response) { return response.json(); })
      .then(function(data) {
        searchData = data;
        searchIndex = lunr(function() {
          this.ref('url');
          this.field('title', { boost: 10 });
          this.field('description', { boost: 5 });
          this.field('content');

          data.forEach(function(doc) {
            this.add(doc);
          }, this);
        });
      });
  }

  // Render results
  function renderResults(results) {
    var container = document.getElementById('search-results');

    if (results.length === 0) {
      container.innerHTML = '<div class="search-empty">No results found</div>';
      return;
    }

    var html = results.slice(0, 10).map(function(result, index) {
      var doc = searchData.find(function(d) { return d.url === result.ref; });
      return '<a href="' + doc.url + '" class="search-result ' + (index === selectedIndex ? 'selected' : '') + '" data-index="' + index + '">' +
        '<div class="search-result-title">' + doc.title + '</div>' +
        '<div class="search-result-url">' + doc.url + '</div>' +
      '</a>';
    }).join('');

    container.innerHTML = html;
  }

  // Handle search
  function handleSearch(query) {
    if (!query.trim()) {
      document.getElementById('search-results').innerHTML = '<div class="search-empty">Type to search...</div>';
      selectedIndex = -1;
      return;
    }

    var results = searchIndex.search(query + '*');
    selectedIndex = results.length > 0 ? 0 : -1;
    renderResults(results);
  }

  // Modal controls
  function openSearch() {
    loadSearchData().then(function() {
      document.getElementById('search-modal').classList.add('open');
      document.getElementById('search-input').focus();
      document.body.style.overflow = 'hidden';
    });
  }

  function closeSearch() {
    document.getElementById('search-modal').classList.remove('open');
    document.getElementById('search-input').value = '';
    document.getElementById('search-results').innerHTML = '<div class="search-empty">Type to search...</div>';
    document.body.style.overflow = '';
    selectedIndex = -1;
  }

  // Keyboard navigation
  function navigateResults(direction) {
    var results = document.querySelectorAll('.search-result');
    if (results.length === 0) return;

    if (results[selectedIndex]) {
      results[selectedIndex].classList.remove('selected');
    }

    if (direction === 'down') {
      selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
    } else {
      selectedIndex = Math.max(selectedIndex - 1, 0);
    }

    if (results[selectedIndex]) {
      results[selectedIndex].classList.add('selected');
      results[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function selectResult() {
    var selected = document.querySelector('.search-result.selected');
    if (selected) {
      window.location.href = selected.href;
    }
  }

  // Event listeners
  document.addEventListener('DOMContentLoaded', function() {
    var modal = document.getElementById('search-modal');
    var input = document.getElementById('search-input');
    var backdrop = document.getElementById('search-backdrop');

    // Search trigger button
    var searchTrigger = document.getElementById('search-trigger');
    if (searchTrigger) {
      searchTrigger.addEventListener('click', openSearch);
    }

    // Keyboard shortcut (Cmd/Ctrl + K)
    document.addEventListener('keydown', function(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (modal.classList.contains('open')) {
          closeSearch();
        } else {
          openSearch();
        }
      }

      if (!modal.classList.contains('open')) return;

      if (e.key === 'Escape') {
        closeSearch();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        navigateResults('down');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        navigateResults('up');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectResult();
      }
    });

    // Search input
    if (input) {
      input.addEventListener('input', function(e) {
        handleSearch(e.target.value);
      });
    }

    // Close on backdrop click
    if (backdrop) {
      backdrop.addEventListener('click', closeSearch);
    }
  });
})();
