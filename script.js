(() => {
  'use strict';
  const root = document.documentElement;
  const themeButtons = document.querySelectorAll('.theme-toggle');
  const storedTheme = root.dataset.theme;
  if (!['dark', 'light'].includes(storedTheme)) root.dataset.theme = 'dark';
  function syncTheme() {
    const light = root.dataset.theme === 'light';
    themeButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(light));
      button.setAttribute('aria-label', `Switch to ${light ? 'dark' : 'light'} mode`);
      button.querySelector('.theme-label').textContent = light ? 'Dark mode' : 'Light mode';
    });
    document.querySelector('meta[name="theme-color"]').content = light ? '#f7f7fc' : '#0a0b10';
  }
  themeButtons.forEach(button => button.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('brandon-theme', root.dataset.theme); } catch (_) {}
    syncTheme();
  }));
  syncTheme();

  const menuButton = document.querySelector('.menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  function closeMenu() {
    mobileNav.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
  }
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    mobileNav.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menuButton.focus(); }
  });
  document.addEventListener('click', event => {
    if (!mobileNav.hidden && !event.target.closest('.mobile-bar')) closeMenu();
  });
  window.matchMedia('(min-width: 851px)').addEventListener('change', closeMenu);

  const content = window.PORTFOLIO_CONTENT || {};
  const publicUrl = value => {
    try {
      const parsed = new URL(value);
      return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : null;
    } catch (_) { return null; }
  };
  document.querySelectorAll('[data-platform]').forEach(card => {
    const platform = card.dataset.platform;
    const fallback = content.platforms?.[platform];
    const snapshot = window.PORTFOLIO_STATS?.[platform];
    const validSnapshot = Array.isArray(snapshot?.metrics) && snapshot.metrics.length === 2 && snapshot.metrics.every(value => Number.isSafeInteger(value) && value >= 0);
    const data = validSnapshot ? { ...fallback, metrics: snapshot.metrics } : fallback;
    if (!data) return;
    let populated = false;
    card.querySelectorAll('[data-metric]').forEach(el => {
      const value = data.metrics?.[Number(el.dataset.metric)];
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        el.textContent = value.toLocaleString('en-US');
        el.removeAttribute('aria-label');
        populated = true;
      }
    });
    const url = publicUrl(data.profileUrl);
    if (url) {
      const link = card.querySelector('[data-profile-link]');
      link.href = url;
      link.textContent = 'View profile';
    }
    if (populated) {
      const status = card.querySelector('[data-stats-status]');
      status.textContent = typeof data.status === 'string' ? data.status : 'Practice stats';
      if (validSnapshot && typeof snapshot.updatedAt === 'string') {
        const date = new Date(snapshot.updatedAt);
        if (Number.isFinite(date.getTime())) {
          status.textContent = `Updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' })}`;
          status.title = `Public profile checked ${date.toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`;
        }
      }
    }
    const progress = data.progress;
    if (progress && Number.isFinite(progress.completed) && Number.isFinite(progress.total) && progress.total > 0 && progress.completed >= 0 && progress.completed <= progress.total) {
      const percent = Math.round(100 * progress.completed / progress.total);
      card.querySelector('.stat-progress').hidden = false;
      card.querySelector('progress').value = percent;
      card.querySelector('[data-percent]').textContent = `${percent}%`;
    }
  });
  if (typeof content.portrait?.src === 'string' && content.portrait.src.trim()) {
    document.querySelectorAll('[data-portrait]').forEach(img => {
      const fallbackSrc = 'assets/portrait-placeholder.svg';
      const fallbackAlt = 'BC monogram';
      const note = img.parentElement.querySelector('[data-portrait-note]');
      img.addEventListener('load', () => { if (note) note.hidden = img.getAttribute('src') !== fallbackSrc; }, { once: true });
      img.addEventListener('error', () => { img.src = fallbackSrc; img.alt = fallbackAlt; if (note) note.hidden = false; }, { once: true });
      img.src = content.portrait.src;
      img.alt = content.portrait.alt || 'Brandon Chaney';
    });
  }
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  // Paint the same small pixel cursor across document navigations. Native SVG
  // cursors can stay at their fallback until the browser receives another move.
  (() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const storageKey = 'brandon-cursor-position';
    const designs = {
      default: ['assets/cursor-pink.svg', 2, 1],
      link: ['assets/cursor-pink-link.svg', 7, 1],
      text: ['assets/cursor-pink-text.svg', 9, 9],
      chart: ['assets/cursor-pink-target.svg', 9, 9],
      pressed: ['assets/cursor-pink-pressed.svg', 7, 1],
    };
    const cursor = document.createElement('img');
    cursor.className = 'pixel-pointer';
    cursor.alt = '';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.width = cursor.height = 20;
    cursor.hidden = true;
    document.body.append(cursor);
    Object.values(designs).forEach(([src]) => { const preload = new Image(); preload.src = src; });
    let point = null, frame = null, pressed = false, kind = '';
    function hide() {
      root.classList.remove('pixel-pointer-active');
      cursor.hidden = true;
      cancelAnimationFrame(frame);
      frame = null;
    }
    function paint() {
      frame = null;
      if (!finePointer.matches || !point || document.hidden) { hide(); return; }
      const target = document.elementFromPoint(point.x, point.y);
      if (!target) { hide(); return; }
      let nextKind = 'default';
      if (target.closest('.contribution-day')) nextKind = 'chart';
      else if (target.closest('a,button,summary,[role="button"],[data-name-hover]')) nextKind = pressed ? 'pressed' : 'link';
      else if (target.closest('p,h1:not(#hero-title),h2,h3,.responsibility-label,.responsibility-tools span,input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]),textarea,[contenteditable="true"]')) nextKind = 'text';
      const [src, x, y] = designs[nextKind];
      if (nextKind !== kind) { kind = nextKind; cursor.src = src; cursor.dataset.cursorKind = kind; }
      cursor.style.transform = `translate3d(${point.x - x}px,${point.y - y}px,0)`;
      if (cursor.complete && cursor.naturalWidth) {
        cursor.hidden = false;
        root.classList.add('pixel-pointer-active');
      }
    }
    function queuePaint() { if (frame === null) frame = requestAnimationFrame(paint); }
    function locate(event) {
      if (event.pointerType !== 'mouse' || !finePointer.matches) return;
      point = { x: event.clientX, y: event.clientY };
      queuePaint();
    }
    function remember() {
      if (!point || !finePointer.matches) return;
      try { sessionStorage.setItem(storageKey, JSON.stringify({ ...point, width: innerWidth, height: innerHeight, at: Date.now() })); } catch (_) {}
    }
    function restore() {
      try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey));
        sessionStorage.removeItem(storageKey);
        if (saved && Date.now() - saved.at < 12000 && saved.width === innerWidth && saved.height === innerHeight &&
            Number.isFinite(saved.x) && Number.isFinite(saved.y) && saved.x >= 0 && saved.y >= 0 && saved.x < innerWidth && saved.y < innerHeight) {
          point = { x: saved.x, y: saved.y };
        }
      } catch (_) {}
      pressed = false;
      paint();
    }
    cursor.addEventListener('load', paint);
    cursor.addEventListener('error', hide);
    document.addEventListener('pointermove', locate, { passive: true });
    document.addEventListener('pointerdown', event => { locate(event); pressed = event.pointerType === 'mouse'; queuePaint(); });
    document.addEventListener('pointerup', event => { locate(event); pressed = false; queuePaint(); });
    document.addEventListener('pointercancel', () => { pressed = false; hide(); });
    root.addEventListener('pointerleave', () => { point = null; hide(); });
    document.addEventListener('scroll', queuePaint, { passive: true, capture: true });
    window.addEventListener('resize', () => { if (point && (point.x >= innerWidth || point.y >= innerHeight)) point = null; queuePaint(); });
    window.addEventListener('blur', hide);
    window.addEventListener('focus', queuePaint);
    window.addEventListener('pagehide', remember);
    window.addEventListener('pageshow', restore);
    document.addEventListener('visibilitychange', () => { if (document.hidden) hide(); else queuePaint(); });
    finePointer.addEventListener('change', () => { if (!finePointer.matches) { point = null; hide(); } });
    restore();
  })();

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  (() => {
    const monitor = document.querySelector('.activity-monitor');
    if (!monitor) return;
    const traces = [...monitor.querySelectorAll('.activity-line')];
    const gradients = [...monitor.querySelectorAll('.activity-trail')];
    const point = monitor.querySelector('.activity-point');
    const glow = monitor.querySelector('.activity-glow');
    const WIDTH = 1200, SPEED = 50, TRAIL_SECONDS = 18, SAMPLE_STEP = .05;
    const MAX_POINTS = Math.ceil(TRAIL_SECONDS / SAMPLE_STEP) + 1;
    // This is a decorative signal: its slowly varying shape is generated locally.
    function signal(time) {
      return 34 + Math.sin(time * 1.8 + Math.sin(time * .23)) * (4 + 2 * Math.sin(time * .17))
        + Math.sin(time * 4.4) * 2.7 + Math.sin(time * 6.8 + Math.sin(time * .43)) * .9;
    }
    const samples = Array.from({ length: MAX_POINTS }, (_, i) => {
      const time = (i - MAX_POINTS + 1) * SAMPLE_STEP;
      return { time, y: signal(time) };
    });
    let elapsed = 0, lastSample = 0, previous = null, lastPaint = 0, frame = null, visible = false;
    function path(points) {
      if (!points.length) return '';
      let d = `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i];
        d += `Q${a.x.toFixed(2)} ${a.y.toFixed(2)} ${((a.x + b.x) / 2).toFixed(2)} ${((a.y + b.y) / 2).toFixed(2)}`;
      }
      const end = points[points.length - 1];
      return d + `L${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
    }
    function paint() {
      const head = (900 + elapsed * SPEED) % WIDTH;
      const recent = [], wrapped = [];
      function add(time, y) {
        const x = head - (elapsed - time) * SPEED;
        if (x >= 0) recent.push({ x, y });
        else wrapped.push({ x: x + WIDTH, y });
      }
      samples.forEach(sample => {
        if (elapsed - sample.time <= TRAIL_SECONDS) add(sample.time, sample.y);
      });
      add(elapsed, signal(elapsed));
      [recent, wrapped].forEach((points, i) => {
        traces[i].setAttribute('d', path(points));
        const end = head + (i ? WIDTH : 0);
        gradients[i].setAttribute('x1', end - TRAIL_SECONDS * SPEED);
        gradients[i].setAttribute('x2', end);
      });
      [point, glow].forEach(node => {
        node.setAttribute('cx', head.toFixed(2));
        node.setAttribute('cy', signal(elapsed).toFixed(2));
      });
      // Soft edges hide the sweep's wrap while the older trail fades in place.
      const edge = Math.min(1, head / 24, (WIDTH - head) / 24);
      point.style.opacity = edge;
      glow.style.opacity = edge;
    }
    function tick(now) {
      frame = null;
      if (previous !== null) elapsed += Math.min((now - previous) / 1000, .1);
      previous = now;
      while (elapsed - lastSample >= SAMPLE_STEP) {
        lastSample += SAMPLE_STEP;
        samples.push({ time: lastSample, y: signal(lastSample) });
        if (samples.length > MAX_POINTS) samples.shift();
      }
      if (now - lastPaint >= 1000 / 30) { paint(); lastPaint = now; }
      frame = requestAnimationFrame(tick);
    }
    function sync() {
      const running = visible && !document.hidden && !motion.matches;
      monitor.classList.toggle('is-running', running);
      if (running && frame === null) { previous = null; frame = requestAnimationFrame(tick); }
      else if (!running) { cancelAnimationFrame(frame); frame = null; previous = null; }
    }
    paint();
    if (typeof IntersectionObserver === 'function') {
      const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
      observer.observe(monitor);
    } else { visible = true; sync(); }
    motion.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pagehide', () => { visible = false; sync(); });
    window.addEventListener('pageshow', () => {
      const box = monitor.getBoundingClientRect();
      visible = box.bottom > 0 && box.top < innerHeight;
      sync();
    });
  })();

  // Recent work is a saved public snapshot: no credentials or third-party
  // requests are sent by visitors' browsers. Static HTML remains a fallback.
  (() => {
    const list = document.querySelector('[data-recent-actions]');
    const snapshot = window.PORTFOLIO_ACTIVITY;
    if (!list || !Array.isArray(snapshot?.items)) return;
    const items = snapshot.items.filter(item => typeof item.title === 'string' &&
      typeof item.action === 'string' && publicUrl(item.url) &&
      Number.isFinite(Date.parse(item.date))).slice(0, 3);
    if (!items.length) return;
    const rows = items.map(item => {
      const row = document.createElement('li');
      row.className = 'recent-action';
      const link = document.createElement('a');
      link.href = publicUrl(item.url); link.target = '_blank'; link.rel = 'noopener noreferrer';
      const action = item.action.charAt(0).toUpperCase() + item.action.slice(1);
      const kind = item.source === 'htb' ? (item.detail?.includes('Sherlock') ? ' Sherlock' : ' machine') : '';
      link.textContent = `${action} ${item.title}${kind}`;
      link.title = `${link.textContent} · ${item.detail || (item.source === 'htb' ? 'Hack The Box' : 'GitHub')}`;
      const time = document.createElement('time'); time.dateTime = item.date;
      time.title = new Date(item.date).toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' ET';
      row.append(link, time);
      return row;
    });
    list.replaceChildren(...rows);
    function updateTimes() {
      rows.forEach((row, i) => {
        const date = new Date(items[i].date);
        const age = Math.max(0, (Date.now() - date.getTime()) / 1000);
        const relative = age < 60 ? 'just now' : age < 3600 ? `${Math.floor(age / 60)}m ago` :
          age < 86400 ? `${Math.floor(age / 3600)}h ago` : age < 604800 ? `${Math.floor(age / 86400)}d ago` : null;
        row.querySelector('time').textContent = relative || date.toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', timeZone: 'America/New_York',
        });
      });
    }
    updateTimes();
    setInterval(updateTimes, 60000);
  })();

  // Only the skills centerpiece turns, with long rests between orientations.
  // Pointer position and a focused selector must not silently disable autoplay.
  (() => {
    const visual = document.querySelector('[data-skills-cube]');
    if (!visual) return;
    const orbit = visual.querySelector('.skills-orbit');
    const pause = visual.querySelector('[data-skills-pause]');
    const selectors = [...visual.querySelectorAll('[data-skill-select]')];
    const areas = [
      { title: 'Security operations', detail: 'SIEM · detection · threat hunting', url: 'projects.html', x: -28, y: -35 },
      { title: 'Digital forensics', detail: 'Artifacts · analysis · investigations', url: 'blogs.html#remote-access-note', x: -28, y: -125 },
      { title: 'Networking', detail: 'Traffic analysis · infrastructure', url: 'blogs.html#nosignal-note', x: -28, y: -215 },
      { title: 'Development', detail: 'Python · automation · tooling', url: 'projects.html', x: -28, y: -305 },
      { title: 'Systems administration', detail: 'Endpoints · identity · cloud', url: 'experience.html', x: -65, y: -395 },
    ];
    const stage = visual.querySelector('.skills-stage');
    const leader = visual.querySelector('.skills-leader');
    const tooltip = visual.querySelector('[data-skill-tooltip]');
    const status = visual.querySelector('[data-skills-status]');
    const ROTATION_DELAY = 8000;
    let index = 0, yaw = -35, timer = null, leaderFrame = null;
    let visible = true, paused = motion.matches;
    const title = visual.querySelector('[data-skill-title]');
    const detail = visual.querySelector('[data-skill-detail]');
    const link = visual.querySelector('[data-skill-link]');
    visual.querySelector('.skills-selectors').hidden = false;
    pause.hidden = false;
    function drawLeader() {
      const anchor = visual.querySelector(`[data-skill-face="${index}"][data-face-anchor]`);
      const box = stage.getBoundingClientRect(), label = link.getBoundingClientRect(), face = anchor.getBoundingClientRect();
      const x = face.left + face.width * .5 - box.left;
      const y = face.top + face.height * .45 - box.top;
      const startX = label.right - box.left - 8, startY = label.bottom - box.top;
      leader.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
      leader.querySelector('path').setAttribute('d', `M${startX} ${startY}L${startX + 18} ${startY + 18}L${x} ${y}`);
      leader.querySelector('circle').setAttribute('cx', x);
      leader.querySelector('circle').setAttribute('cy', y);
    }
    function followTurn() {
      cancelAnimationFrame(leaderFrame);
      const until = performance.now() + (motion.matches ? 0 : 1000);
      function tick() {
        drawLeader();
        if (performance.now() < until) leaderFrame = requestAnimationFrame(tick);
        else leaderFrame = null;
      }
      tick();
    }
    function show(next) {
      index = next;
      const area = areas[index];
      visual.dataset.activeArea = String(index);
      yaw = area.y + 360 * Math.round((yaw - area.y) / 360);
      orbit.style.transform = `rotateX(${area.x}deg) rotateY(${yaw}deg)`;
      title.textContent = area.title;
      detail.textContent = area.detail;
      link.href = area.url;
      selectors.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
      tooltip.hidden = true;
      followTurn();
    }
    function sync() {
      clearTimeout(timer);
      timer = null;
      pause.setAttribute('aria-pressed', String(paused));
      pause.setAttribute('aria-label', paused ? 'Start cube rotation' : 'Pause cube rotation');
      pause.title = paused ? 'Start cube rotation' : 'Pause cube rotation';
      pause.classList.toggle('is-paused', paused);
      status.textContent = paused ? 'Rotation paused' : 'Auto rotation';
      if (paused || document.hidden || !visible) return;
      timer = setTimeout(() => { show((index + 1) % areas.length); sync(); }, ROTATION_DELAY);
    }
    selectors.forEach((button, i) => button.addEventListener('click', () => { show(i); sync(); }));
    pause.addEventListener('click', () => {
      paused = !paused;
      sync();
    });
    stage.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      const face = event.target.closest('[data-skill-face]');
      if (!face || !face.querySelector('svg')) { tooltip.hidden = true; return; }
      const areaIndex = Number(face.dataset.skillFace), area = areas[areaIndex];
      tooltip.dataset.area = String(areaIndex);
      tooltip.querySelector('strong').textContent = face.dataset.skillLabel || area.title;
      tooltip.querySelector('span').textContent = face.dataset.skillExample || area.detail;
      tooltip.hidden = false;
      const bounds = tooltip.getBoundingClientRect();
      const x = Math.max(8, Math.min(event.clientX + 20, innerWidth - bounds.width - 8));
      const y = Math.max(8, Math.min(event.clientY + 18, innerHeight - bounds.height - 8));
      tooltip.style.left = `${x}px`; tooltip.style.top = `${y}px`;
    }, { passive: true });
    stage.addEventListener('pointerleave', () => { tooltip.hidden = true; });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') tooltip.hidden = true; });
    window.addEventListener('scroll', () => { tooltip.hidden = true; }, { passive: true });
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', () => { paused = motion.matches; sync(); });
    if (typeof IntersectionObserver === 'function') {
      new IntersectionObserver(entries => {
        const next = entries[0].isIntersecting;
        if (next !== visible) { visible = next; sync(); }
      }).observe(stage);
    }
    if (typeof ResizeObserver === 'function') new ResizeObserver(drawLeader).observe(stage);
    else window.addEventListener('resize', drawLeader);
    window.addEventListener('pagehide', () => { clearTimeout(timer); cancelAnimationFrame(leaderFrame); });
    window.addEventListener('pageshow', () => {
      const box = stage.getBoundingClientRect();
      visible = box.bottom > 0 && box.top < innerHeight;
      drawLeader(); sync();
    });
    drawLeader();
    sync();
  })();
})();
