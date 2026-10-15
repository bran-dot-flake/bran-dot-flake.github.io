(() => {
  'use strict';
  function metric(card, index) {
    const text = card?.querySelector(`[data-metric="${index}"]`)?.textContent || '';
    const value = Number.parseInt(text.replaceAll(',', ''), 10);
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  const htb = document.querySelector('[data-platform="htb"]');
  if (htb) {
    const values = [metric(htb, 0), metric(htb, 1)];
    const maximum = Math.max(...values.filter(value => value !== null), 1);
    htb.querySelectorAll('[data-htb-bar]').forEach(bar => {
      const value = values[Number(bar.dataset.htbBar)];
      bar.style.width = value === null ? '0%' : `${100 * value / maximum}%`;
    });
    const recent = htb.querySelector('[data-htb-recent]');
    const labs = (window.PORTFOLIO_ACTIVITY?.items || []).filter(item => {
      if (item.source !== 'htb' || typeof item.title !== 'string') return false;
      try { return ['https:', 'http:'].includes(new URL(item.url).protocol); }
      catch (_) { return false; }
    }).slice(0, 2);
    if (recent && labs.length) {
      recent.replaceChildren(...labs.map(item => {
        const link = document.createElement('a');
        link.href = item.url; link.textContent = item.title;
        link.target = '_blank'; link.rel = 'noopener noreferrer';
        return link;
      }));
    }
  }
  const web = document.querySelector('[data-platform="portswigger"]');
  if (web) web.classList.toggle('metrics-unavailable', metric(web, 0) === null && metric(web, 1) === null);
})();
