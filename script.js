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

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
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
    index = 0;
    setStage('console');
    addIntro();
    appendPrompt();
    commandEl.textContent = sequence[0].command;
    renderOutput(sequence[0].output);
  }
  function startSession() {
    cancelStep();
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
      if (service < services.length) schedule(nextLine, 55);
      else schedule(() => {
        setStage('splash');
        schedule(() => {
          setStage('blank');
          schedule(startSession, 320);
        }, 2600);
      }, 220);
    }
    nextLine();
  }
  terminalControl.hidden = motion.matches;
  if (motion.matches || document.hidden) showStatic();
  else startBoot();
  terminalControl.addEventListener('click', () => {
    if (terminal.dataset.terminalStage === 'console') startBoot();
    else startSession();
  });
  motion.addEventListener('change', () => {
    terminalControl.hidden = motion.matches;
    if (motion.matches) showStatic();
    else startSession();
  });
  document.addEventListener('visibilitychange', () => {
    terminal.classList.toggle('terminal-paused', document.hidden);
    if (document.hidden) {
      if (timer !== null) remaining = Math.max(0, deadline - performance.now());
      clearTimeout(timer);
      timer = null;
    } else if (!motion.matches) {
      if (nextStep) schedule(nextStep, remaining);
      else startSession();
    }
  });
})();
