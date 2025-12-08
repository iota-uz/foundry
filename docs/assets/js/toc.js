document.addEventListener('DOMContentLoaded', function() {
  var tocNav = document.getElementById('toc-nav');
  var tocSidebar = document.getElementById('toc-sidebar');
  if (!tocNav) return;

  // Find all headings in main content
  var mainContent = document.querySelector('.main-content');
  if (!mainContent) return;

  var headings = mainContent.querySelectorAll('h2, h3');
  if (headings.length < 2) {
    // Hide TOC if fewer than 2 headings
    if (tocSidebar) tocSidebar.style.display = 'none';
    return;
  }

  // Build TOC structure
  var tocList = document.createElement('ul');
  tocList.className = 'toc-list';

  var currentH2Item = null;
  var currentH3List = null;

  headings.forEach(function(heading, index) {
    // Ensure heading has an ID
    if (!heading.id) {
      heading.id = 'heading-' + index;
    }

    var li = document.createElement('li');
    li.className = 'toc-item';

    var link = document.createElement('a');
    link.className = 'toc-link';
    link.href = '#' + heading.id;
    link.textContent = heading.textContent;
    link.setAttribute('data-heading-id', heading.id);

    li.appendChild(link);

    if (heading.tagName === 'H2') {
      li.classList.add('toc-item--h2');
      tocList.appendChild(li);
      currentH2Item = li;
      currentH3List = null;
    } else if (heading.tagName === 'H3') {
      li.classList.add('toc-item--h3');

      if (currentH2Item) {
        if (!currentH3List) {
          currentH3List = document.createElement('ul');
          currentH3List.className = 'toc-sublist';
          currentH2Item.appendChild(currentH3List);
        }
        currentH3List.appendChild(li);
      } else {
        tocList.appendChild(li);
      }
    }
  });

  tocNav.appendChild(tocList);

  // Scroll spy with Intersection Observer
  var observerOptions = {
    root: null,
    rootMargin: '-80px 0px -80% 0px',
    threshold: 0
  };

  var activeLink = null;

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var id = entry.target.id;
        var link = tocNav.querySelector('[data-heading-id="' + id + '"]');

        if (activeLink) {
          activeLink.classList.remove('active');
          var activeTocItem = activeLink.closest('.toc-item');
          if (activeTocItem) activeTocItem.classList.remove('active');
        }

        if (link) {
          link.classList.add('active');
          var tocItem = link.closest('.toc-item');
          if (tocItem) tocItem.classList.add('active');
          activeLink = link;
        }
      }
    });
  }, observerOptions);

  headings.forEach(function(heading) {
    observer.observe(heading);
  });

  // Smooth scroll on click
  tocNav.addEventListener('click', function(e) {
    if (e.target.classList.contains('toc-link')) {
      e.preventDefault();
      var targetId = e.target.getAttribute('href').slice(1);
      var target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, null, '#' + targetId);
      }
    }
  });
});
