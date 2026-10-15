(() => {
  'use strict';
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const target = event.target;
    // Cube surfaces, selectors, and pause controls keep their own behavior.
    if (target.closest('[data-skills-cube]')) return;
    const card = target.closest('[data-card-href]');
    if (!card || target.closest('a,button,summary,input,select,textarea,[contenteditable="true"]')) return;
    if (window.getSelection()?.toString().trim()) return;
    window.location.assign(card.dataset.cardHref);
  });
})();
