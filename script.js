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

  const terminal = document.querySelector('[data-terminal-stage]');
  const consoleEl = document.getElementById('terminal-console');
  const historyEl = document.getElementById('terminal-history');
  const bootEl = document.getElementById('terminal-boot');
  const bootLog = document.getElementById('terminal-boot-log');
  const splashEl = document.getElementById('terminal-splash');
  const terminalControl = document.getElementById('terminal-control');
  if (!terminal || !consoleEl || !historyEl || !bootEl || !bootLog || !splashEl || !terminalControl) return;

  const MAX_TERMINAL_ENTRIES = 10;
  const sequence = [
    { command: 'whoami', output: ['brandon', 'IT specialist · security operations'] },
    { command: 'ls investigations/', output: ['wireshark/  soc-pipeline/', 'ioc-analyzer/  sentinel/'] },
    { command: 'cat focus.txt', output: ['Incident response', 'Detection engineering', 'Network and host analysis'] },
    { command: 'echo $STATUS', output: ['CURIOUS. INVESTIGATING.', 'BUILDING.'] },
  ];
  const services = [
    ['OK', 'Starting portfolio kernel...'], ['OK', 'Mounted /home/brandon.'],
    ['OK', 'Starting curiosity.service...'], ['OK', 'Loading system fundamentals...'],
    ['OK', 'Starting network interfaces...'], ['OK', 'Connected to the lab.'],
    ['WARN', 'Optional live feed unavailable.'], ['OK', 'Loading local packet captures...'],
    ['OK', 'Starting host telemetry...'], ['OK', 'Starting sysmon.service...'],
    ['FAILED', 'Demo telemetry connection timed out.'], ['OK', 'Continuing with saved lab notes.'],
    ['OK', 'Starting wazuh.service...'], ['OK', 'Starting shuffle.service...'],
    ['OK', 'Connecting TheHive...'], ['OK', 'Loading IOC enrichment...'],
    ['WARN', 'Verbose logging disabled.'], ['OK', 'Starting sentinel.service...'],
    ['OK', 'Indexing investigation notes...'], ['FAILED', 'Optional sandbox probe offline.'],
    ['OK', 'Fallback workspace ready.'], ['OK', 'Mounted /projects.'],
    ['OK', 'Mounted /blogs.'], ['OK', 'Loading certifications...'],
    ['OK', 'Loading experience timeline...'], ['OK', 'Starting terminal session...'],
    ['OK', 'All systems ready.'], ['OK', 'Launching portfolio...'],
  ];
  const BOOT_LINE_DELAY = 55;
  const BOOT_SETTLE_DELAY = 220;
  const NAME_DECODE_DURATION = 850;
  const nameDecoder = (() => {
    const heading = document.getElementById('hero-title');
    const whoami = document.getElementById('hero-whoami');
    if (!heading) return null;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#+/=_$@';
    const letters = [];
    heading.querySelectorAll('[data-name-part]').forEach(part => {
      const nodes = [...part.textContent].map(char => {
        const node = document.createElement('span');
        node.className = 'decode-character';
        node.textContent = char;
        letters.push({ node, char });
        return node;
      });
      part.replaceChildren(...nodes);
    });
    let timer = null, active = false, elapsed = 0, previous = 0, duration = NAME_DECODE_DURATION, run = 0;
    function finish(expectedRun) {
      if (expectedRun !== undefined && expectedRun !== run) return;
      clearTimeout(timer);
      timer = null;
      active = false;
      if (whoami) whoami.textContent = 'whoami';
      letters.forEach(({ node, char }) => { node.textContent = char; node.dataset.locked = 'true'; });
      heading.dataset.nameState = 'resolved';
      heading.dataset.nameLocked = String(letters.length);
    }
    function paint() {
      if (whoami) whoami.textContent = 'whoami'.slice(0, Math.min(6, Math.floor(elapsed / 100)));
      // A short scrambled lead-in, then characters lock in from left to right.
      const progress = Math.max(0, Math.min(1, (elapsed / duration - .12) / .88));
      const locked = Math.floor(progress * letters.length);
      letters.forEach(({ node, char }, i) => {
        const resolved = i < locked;
        node.dataset.locked = String(resolved);
        node.textContent = resolved ? char : alphabet[Math.floor(Math.random() * alphabet.length)];
      });
      heading.dataset.nameLocked = String(locked);
    }
    function tick() {
      timer = null;
      if (!active || document.hidden || motion.matches) return;
      const now = performance.now();
      elapsed += now - previous;
      previous = now;
      if (elapsed >= duration) { finish(); return; }
      paint();
      timer = setTimeout(tick, Math.min(50, duration - elapsed));
    }
    function start() {
      clearTimeout(timer);
      timer = null;
      run += 1;
      if (motion.matches || document.hidden) { finish(); return run; }
      active = true;
      elapsed = 0;
      previous = performance.now();
      heading.dataset.nameState = 'decoding';
      paint();
      timer = setTimeout(tick, 50);
      return run;
    }
    function pause() {
      if (active) elapsed += Math.max(0, performance.now() - previous);
      clearTimeout(timer);
      timer = null;
    }
    function resume() {
      if (!active || motion.matches) return;
      if (elapsed >= duration) { finish(); return; }
      previous = performance.now();
      clearTimeout(timer);
      timer = setTimeout(tick, Math.min(50, duration - elapsed));
    }
    heading.querySelectorAll('[data-name-hover]').forEach(target => {
      target.addEventListener('pointerenter', event => {
        if (event.pointerType !== 'touch') start();
      });
    });
    finish();
    return { start, finish, pause, resume };
  })();
  let commandEl = document.getElementById('terminal-command');
  let outputEl = document.getElementById('terminal-output');
  const cursorEl = consoleEl.querySelector('.cursor');
  let loadingDots, timer = null, nextStep = null, remaining = 0, deadline = 0, index = 0, scrollAnimation = null;

  // One scheduled callback, including when paused. Replay and skip cancel it first.
  function cancelStep() {
    clearTimeout(timer);
    timer = null;
    nextStep = null;
  }
  function schedule(callback, delay) {
    clearTimeout(timer);
    timer = null;
    nextStep = callback;
    remaining = delay;
    deadline = performance.now() + delay;
    if (document.hidden || motion.matches) return;
    timer = setTimeout(() => {
      timer = null;
      nextStep = null;
      callback();
    }, delay);
  }
  function setStage(stage) {
    terminal.dataset.terminalStage = stage;
    consoleEl.hidden = stage !== 'console';
    bootEl.hidden = stage !== 'boot';
    splashEl.hidden = stage !== 'splash';
    const label = stage === 'console' ? 'Replay terminal startup' : 'Skip terminal startup';
    terminalControl.setAttribute('aria-label', label);
    terminalControl.title = label;
  }
  function followLatest(fromY) {
    const offset = Math.max(0, historyEl.scrollHeight - consoleEl.clientHeight);
    consoleEl.classList.toggle('is-scrolling', offset > 0);
    const target = `translateY(-${offset}px)`;
    if (fromY === undefined && historyEl.style.transform === target) return;
    const startY = fromY ?? historyEl.getBoundingClientRect().top - consoleEl.getBoundingClientRect().top;
    scrollAnimation?.cancel();
    scrollAnimation = null;
    historyEl.style.transform = target;
    if (!motion.matches && Math.abs(startY + offset) > .5) {
      // Explicit keyframes animate even when pruning leaves the final offset unchanged.
      scrollAnimation = historyEl.animate([
        { transform: `translateY(${startY}px)` },
        { transform: target },
      ], { duration: 180, easing: 'ease-out' });
    }
  }
  function addIntro() {
    scrollAnimation?.cancel();
    scrollAnimation = null;
    historyEl.replaceChildren();
    historyEl.style.transform = 'translateY(0)';
    consoleEl.classList.remove('is-scrolling');
    const intro = document.createElement('div');
    intro.className = 'terminal-intro';
    const start = document.createElement('p');
    const dollar = document.createElement('span');
    dollar.className = 'terminal-green';
    dollar.textContent = '$';
    start.append(dollar, ' ./explore.sh');
    const loading = document.createElement('p');
    loading.className = 'terminal-dim';
    loadingDots = document.createElement('span');
    loadingDots.className = 'loading-dots';
    loadingDots.textContent = '...';
    loading.append('Loading recent work', loadingDots);
    intro.append(start, loading);
    historyEl.append(intro);
  }
  function appendPrompt() {
    const willTrim = historyEl.childElementCount >= MAX_TERMINAL_ENTRIES;
    const anchor = historyEl.lastElementChild;
    const anchorTop = willTrim ? anchor.getBoundingClientRect().top : 0;
    const visibleY = willTrim ? historyEl.getBoundingClientRect().top - consoleEl.getBoundingClientRect().top : 0;
    // IDs always identify the current prompt; older commands remain as plain history.
    commandEl?.removeAttribute('id');
    outputEl?.removeAttribute('id');
    const entry = document.createElement('div');
    entry.className = 'terminal-entry';
    const prompt = document.createElement('p');
    prompt.className = 'terminal-prompt';
    const host = document.createElement('span');
    host.className = 'terminal-green';
    host.textContent = 'brandon@lab';
    const path = document.createElement('span');
    path.className = 'terminal-dim';
    path.textContent = ':~$';
    commandEl = document.createElement('span');
    commandEl.id = 'terminal-command';
    prompt.append(host, path, ' ', commandEl, cursorEl);
    outputEl = document.createElement('pre');
    outputEl.id = 'terminal-output';
    entry.append(prompt, outputEl);
    historyEl.append(entry);
    // Entire groups are removed, including their output. No unbounded history array.
    while (historyEl.childElementCount > MAX_TERMINAL_ENTRIES) historyEl.firstElementChild.remove();
    if (willTrim) {
      // Removing history changes layout even when the final scroll offset is unchanged.
      // Rebase at the current visible position, then animate to the new bottom.
      const removedHeight = anchorTop - anchor.getBoundingClientRect().top;
      followLatest(visibleY + removedHeight);
    } else followLatest();
  }
  function renderOutput(rows, follow = true) {
    outputEl.replaceChildren();
    rows.forEach(text => {
      const line = document.createElement('span');
      line.className = 'terminal-output-line';
      line.textContent = text;
      outputEl.append(line);
    });
    if (follow) followLatest();
  }
  function typeCommand() {
    const item = sequence[index];
    let char = 0;
    function type() {
      commandEl.textContent += item.command.charAt(char++);
      followLatest();
      if (char < item.command.length) schedule(type, 60);
      else schedule(() => {
        renderOutput(item.output, false);
        index = (index + 1) % sequence.length;
        appendPrompt();
        schedule(typeCommand, 1750);
      }, 240);
    }
    type();
  }
  function showStatic() {
    cancelStep();
    nameDecoder?.finish();
    index = 0;
    setStage('console');
    addIntro();
    appendPrompt();
    commandEl.textContent = sequence[0].command;
    renderOutput(sequence[0].output);
  }
  function startSession(finishName = true) {
    cancelStep();
    if (finishName) nameDecoder?.finish();
    if (motion.matches) { showStatic(); return; }
    index = 0;
    setStage('console');
    addIntro();
    let dots = 1;
    loadingDots.textContent = '.';
    function load() {
      if (dots < 3) {
        loadingDots.textContent = '.'.repeat(++dots);
        schedule(load, 340);
      } else {
        appendPrompt();
        schedule(typeCommand, 350);
      }
    }
    schedule(load, 340);
  }
  function startBoot() {
    cancelStep();
    if (motion.matches) { showStatic(); return; }
    const nameRun = nameDecoder?.start();
    bootLog.replaceChildren();
    setStage('boot');
    let service = 0;
    function nextLine() {
      const [code, text] = services[service++];
      const line = document.createElement('div');
      line.className = 'terminal-boot-line';
      const status = document.createElement('span');
      status.className = 'terminal-boot-status';
      status.dataset.status = code;
      const label = document.createElement('b');
      label.textContent = code;
      status.append('[ ', label, ' ]');
      const message = document.createElement('span');
      message.className = 'terminal-boot-message';
      message.textContent = text;
      line.append(status, message);
      bootLog.append(line);
      if (bootLog.childElementCount > 16) bootLog.firstElementChild.remove();
      if (service < services.length) schedule(nextLine, BOOT_LINE_DELAY);
      else schedule(() => {
        nameDecoder?.finish(nameRun);
        setStage('splash');
        schedule(() => {
          setStage('blank');
          schedule(() => startSession(false), 320);
        }, 2600);
      }, BOOT_SETTLE_DELAY);
    }
    nextLine();
  }
  const expandButton = terminal.querySelector('[data-terminal-expand]');
  const desktopTerminal = window.matchMedia('(min-width: 851px)');
  let bounceAnimation = null;
  terminal.querySelectorAll('[data-terminal-bounce]').forEach(button => {
    button.addEventListener('click', () => {
      bounceAnimation?.cancel();
      bounceAnimation = null;
      if (!motion.matches) bounceAnimation = terminal.animate([
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(-4px) scale(1.015)', offset: .35 },
        { transform: 'translateY(1px) scale(.997)', offset: .72 },
        { transform: 'translateY(0) scale(1)' },
      ], { duration: 330, easing: 'ease-out' });
    });
  });
  function syncExpansion() {
    if (!expandButton) return;
    if (!desktopTerminal.matches) terminal.classList.remove('terminal-expanded');
    const expanded = terminal.classList.contains('terminal-expanded');
    expandButton.disabled = !desktopTerminal.matches;
    expandButton.setAttribute('aria-pressed', String(expanded));
    expandButton.setAttribute('aria-label', expanded ? 'Restore terminal height' : 'Expand terminal height');
    expandButton.title = desktopTerminal.matches ? (expanded ? 'Restore terminal height' : 'Expand terminal height') : 'Expand on desktop; mobile keeps a fixed height';
  }
  expandButton?.addEventListener('click', () => { terminal.classList.toggle('terminal-expanded'); syncExpansion(); });
  desktopTerminal.addEventListener('change', syncExpansion);
  syncExpansion();
  const viewport = terminal.querySelector('.terminal-viewport');
  if (viewport && typeof ResizeObserver === 'function') {
    const viewportObserver = new ResizeObserver(() => { if (terminal.dataset.terminalStage === 'console') followLatest(); });
    viewportObserver.observe(viewport);
  }
  terminalControl.hidden = motion.matches;
  if (motion.matches || document.hidden) showStatic();
  else startBoot();
  terminalControl.addEventListener('click', () => {
    if (terminal.dataset.terminalStage === 'console') startBoot();
    else startSession();
  });
  motion.addEventListener('change', () => {
    bounceAnimation?.cancel();
    bounceAnimation = null;
    terminalControl.hidden = motion.matches;
    if (motion.matches) showStatic();
    else startSession();
  });
  document.addEventListener('visibilitychange', () => {
    terminal.classList.toggle('terminal-paused', document.hidden);
    if (document.hidden) {
      nameDecoder?.pause();
      if (timer !== null) remaining = Math.max(0, deadline - performance.now());
      clearTimeout(timer);
      timer = null;
    } else if (!motion.matches) {
      nameDecoder?.resume();
      if (nextStep) schedule(nextStep, remaining);
      else startSession();
    }
  });
})();
