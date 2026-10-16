(() => {
  'use strict';
  function metric(card, index) {
    const value = Number.parseInt((card?.querySelector(`[data-metric="${index}"]`)?.textContent || '').replaceAll(',', ''), 10);
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  function safeUrl(value, image = false) {
    try {
      const url = new URL(value, location.href);
      if (url.protocol !== 'https:' && url.origin !== location.origin) return null;
      if (image && url.origin !== location.origin && !['cdn.services-k8s.prod.aws.htb.systems', 'labs.hackthebox.com', 'app.hackthebox.com', 'account.hackthebox.com', 'profile.hackthebox.com', 'assets.hackthebox.com', 'htb-experience-prod-public-storage.s3.amazonaws.com'].includes(url.hostname)) return null;
      return url.href;
    } catch (_) { return null; }
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
    const activity = window.PORTFOLIO_ACTIVITY || {};
    const completions = (activity.htbRecent || activity.items || []).filter(item => item.source === 'htb' && typeof item.title === 'string' && Number.isFinite(Date.parse(item.date)) && safeUrl(item.url)).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    const seen = new Set();
    const labs = ['machine', 'Sherlock'].flatMap(kind => completions.filter(item => {
      const key = `${kind}:${item.title.toLowerCase()}`;
      if (!item.detail?.includes(kind) || seen.has(key)) return false;
      seen.add(key); return true;
    }).slice(0, 2).map(item => ({ ...item, kind })));
    if (recent && labs.length) recent.replaceChildren(...labs.map(item => {
      const link = document.createElement('a');
      link.href = safeUrl(item.url); link.append(document.createTextNode(item.title));
      const kind = document.createElement('small'); kind.textContent = item.kind; link.append(kind);
      link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.title = `Completed ${new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })}`;
      return link;
    }));
    const profile = window.PORTFOLIO_STATS?.htb?.profile;
    const rank = htb.querySelector('[data-htb-rank]');
    if (rank && profile && typeof profile.title === 'string' && Number.isSafeInteger(profile.level) && profile.level > 0) {
      const grade = ['I', 'II', 'III'][Number(profile.grade) - 1] || '';
      rank.querySelector('[data-htb-rank-title]').textContent = `${profile.title} ${grade}`.trim();
      rank.querySelector('[data-htb-level]').textContent = profile.level;
      const image = rank.querySelector('[data-htb-rank-image]');
      const imageUrl = safeUrl(profile.image, true);
      if (imageUrl) { image.src = imageUrl; image.alt = `HTB ${profile.title} rank badge`; }
      image.addEventListener('error', () => { image.hidden = true; }, { once: true });
      const xp = rank.querySelector('[data-htb-xp]');
      const validXp = Number.isSafeInteger(profile.xp) && Number.isSafeInteger(profile.xpTotal) && profile.xp >= 0 && profile.xpTotal > 0 && profile.xp <= profile.xpTotal;
      xp.hidden = !validXp;
      if (validXp) { xp.max = profile.xpTotal; xp.value = profile.xp; xp.title = `${profile.xp.toLocaleString('en-US')} / ${profile.xpTotal.toLocaleString('en-US')} XP`; }
      const date = new Date(profile.updatedAt);
      if (Number.isFinite(date.getTime())) {
        const status = rank.querySelector('[data-htb-rank-status]');
        const label = profile.source === 'public-profile' ? 'Profile checked' : 'Profile snapshot';
        status.textContent = `${label} ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })}`;
        status.title = date.toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' ET';
      }
    }
  }
  const web = document.querySelector('[data-platform="portswigger"]');
  if (web) web.classList.toggle('metrics-unavailable', metric(web, 0) === null && metric(web, 1) === null);
})();
