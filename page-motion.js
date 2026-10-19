/* One-time entrances. Layout is measured by the final, fully populated content. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !('IntersectionObserver' in window)) return;
  const tasks = new Map();
  const clamp = value => Math.max(0, Math.min(1, value));
  const progress = (elapsed, delay, duration) => clamp((elapsed - delay) / duration);
  const ease = t => 1 - (1 - t) ** 3;
  const spring = (t, tension = 1.1) => t === 0 ? 0 : t === 1 ? 1
    : 1 + (tension + 1) * (t - 1) ** 3 + tension * (t - 1) ** 2;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || entry.intersectionRatio < .12) return;
      tasks.get(entry.target)?.start();
    });
  }, { threshold: .12 });

  function entrance(target, duration, paint, restore) {
    let frame = null;
    const task = {
      finish() {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        observer.unobserve(target);
        restore();
        target.dataset.motionState = 'complete';
      },
      start() {
        if (target.dataset.motionState !== 'waiting') return;
        observer.unobserve(target);
        target.dataset.motionState = 'running';
        let started;
        function tick(now) {
          started ??= now;
          const elapsed = now - started;
          if (elapsed >= duration) { task.finish(); return; }
          paint(elapsed);
          frame = requestAnimationFrame(tick);
        }
        frame = requestAnimationFrame(tick);
      },
    };
    tasks.set(target, task);
    paint(0);
    target.dataset.motionState = 'waiting';
    observer.observe(target);
    // Keyboard and anchor navigation must never land on invisible content.
    target.addEventListener('focusin', () => task.finish());
  }

  const constellation = document.querySelector('.topic-constellation');
  if (constellation) {
    const nodes = [...constellation.querySelectorAll('[data-topic-kind]')].map(node => {
      const dot = node.querySelector('.topic-dot');
      return { node, kind: node.dataset.topicKind, cluster: node.dataset.topicCluster,
        x: Number(dot.getAttribute('cx')), y: Number(dot.getAttribute('cy')),
        transform: node.getAttribute('transform'), opacity: node.style.opacity,
        pointerEvents: node.style.pointerEvents };
    });
    const root = nodes.find(node => node.kind === 'root');
    const hubs = new Map(nodes.filter(node => node.kind === 'hub').map(node => [node.cluster, node]));
    const siblings = new Map();
    nodes.forEach(record => {
      const hub = hubs.get(record.cluster);
      const order = siblings.get(record.cluster) || 0;
      if (record.kind === 'topic') siblings.set(record.cluster, order + 1);
      const origin = record.kind === 'topic' ? hub : root;
      const distance = Math.hypot(record.x - origin.x, record.y - origin.y);
      record.delay = record.kind === 'root' ? 0 : 70 + Number(record.cluster) * 55
        + (record.kind === 'topic' ? 210 + order * 25 : 0);
      record.duration = record.kind === 'root' ? 220 : record.kind === 'hub'
        ? 590 + Math.min(distance, 500) * .35 : 440 + Math.min(distance, 220) * 1.15;
      record.tension = 1 + (order % 3) * .18;
      record.node.style.pointerEvents = 'none';
    });
    const edges = [...constellation.querySelectorAll('[data-topic-edge]')].map(path => {
      const d = path.getAttribute('d'), coordinates = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
      const hub = hubs.get(path.dataset.topicCluster);
      const end = path.dataset.topicEdge === 'hub' ? root : nodes.find(node => node.kind === 'topic'
        && node.cluster === hub.cluster && node.x === coordinates[2] && node.y === coordinates[3]);
      return { path, d, hub, end, opacity: path.style.opacity };
    });
    const duration = Math.max(...nodes.map(node => node.delay + node.duration));
    entrance(constellation, duration, elapsed => {
      root.current = { x: root.x, y: root.y };
      nodes.filter(record => record.kind === 'hub').forEach(record => {
        const amount = spring(progress(elapsed, record.delay, record.duration), record.tension);
        record.current = { x: root.x + (record.x - root.x) * amount,
          y: root.y + (record.y - root.y) * amount };
      });
      nodes.forEach(record => {
        const t = progress(elapsed, record.delay, record.duration);
        if (record.kind === 'topic') {
          const hub = hubs.get(record.cluster), amount = spring(t, record.tension);
          record.current = { x: hub.current.x + (record.x - hub.x) * amount,
            y: hub.current.y + (record.y - hub.y) * amount };
        }
        record.node.setAttribute('transform', `translate(${record.current.x - record.x} ${record.current.y - record.y})`);
        record.node.style.opacity = ease(t);
        // Labels arrive after their points spread apart, avoiding a pile of text.
        record.node.querySelector('text').style.opacity = ease(clamp((t - .24) / .76));
      });
      edges.forEach(({ path, hub, end }) => {
        path.setAttribute('d', `M${hub.current.x},${hub.current.y} L${end.current.x},${end.current.y}`);
        path.style.opacity = ease(progress(elapsed, end.kind === 'root' ? hub.delay : end.delay, 300));
      });
    }, () => {
      nodes.forEach(({ node, transform, opacity, pointerEvents }) => {
        if (transform === null) node.removeAttribute('transform');
        else node.setAttribute('transform', transform);
        node.style.opacity = opacity;
        node.style.pointerEvents = pointerEvents;
        node.querySelector('text').style.removeProperty('opacity');
      });
      edges.forEach(({ path, d, opacity }) => { path.setAttribute('d', d); path.style.opacity = opacity; });
    });
  }

  const capabilities = document.querySelector('.capability-diagram');
  if (capabilities) {
    const fades = [];
    const addFades = (selector, delay, stagger) => {
      capabilities.querySelectorAll(selector).forEach((node, i) => {
        fades.push({ node, delay: delay + i * stagger, opacity: node.style.opacity,
          transform: node.getAttribute('transform') });
      });
    };
    addFades('.capability-source', 0, 85);
    addFades('.capability-area', 730, 100);
    addFades('.capability-direction', 1340, 100);
    addFades('.capability-column-labels text', 0, 650);
    const sourceWires = [...capabilities.querySelectorAll('.capability-wire')];
    const directionWires = [...capabilities.querySelectorAll('.capability-direction-wire')];
    const wires = [...sourceWires, ...directionWires].map((node, i) => {
      const direction = node.classList.contains('capability-direction-wire');
      const row = direction ? i - sourceWires.length : node.classList.contains('capability-wire-pink') ? 0
        : node.classList.contains('capability-wire-green') ? 1 : 2;
      return { node, delay: direction ? 1050 + row * 100 : 300 + row * 85,
        length: node.getAttribute('pathLength'), dash: node.style.strokeDasharray,
        offset: node.style.strokeDashoffset, opacity: node.style.opacity };
    });
    wires.forEach(({ node }) => { node.setAttribute('pathLength', '1'); node.style.strokeDasharray = '1'; });
    entrance(capabilities, 2060, elapsed => {
      fades.forEach(({ node, delay }) => {
        const amount = ease(progress(elapsed, delay, 480));
        node.style.opacity = amount;
        node.setAttribute('transform', `translate(${-12 * (1 - amount)} 0)`);
      });
      wires.forEach(({ node, delay }) => {
        const amount = ease(progress(elapsed, delay, 430));
        node.style.strokeDashoffset = 1 - amount;
        node.style.opacity = amount;
      });
    }, () => {
      fades.forEach(({ node, opacity, transform }) => {
        node.style.opacity = opacity;
        if (transform === null) node.removeAttribute('transform');
        else node.setAttribute('transform', transform);
      });
      wires.forEach(({ node, length, dash, offset, opacity }) => {
        if (length === null) node.removeAttribute('pathLength');
        else node.setAttribute('pathLength', length);
        node.style.strokeDasharray = dash; node.style.strokeDashoffset = offset; node.style.opacity = opacity;
      });
    });
  }

  function reveal(target, content, delay = 0, x = 0, duration = 560) {
    const opacity = content.style.opacity, translate = content.style.translate;
    entrance(target, delay + duration, elapsed => {
      const amount = ease(progress(elapsed, delay, duration));
      content.style.opacity = amount;
      // Individual translate composes with hover transforms and never affects flow.
      content.style.translate = `${x * (1 - amount)}px ${16 * (1 - amount)}px`;
    }, () => { content.style.opacity = opacity; content.style.translate = translate; });
  }
  document.querySelectorAll('.timeline-entry').forEach((entry, i) => {
    reveal(entry, entry.querySelector('.timeline-card'), 0, i % 2 ? 14 : -14, 340);
  });
  function finishAnchor() {
    let anchor;
    try { anchor = document.getElementById(decodeURIComponent(location.hash.slice(1))); }
    catch (_) { return; }
    if (!anchor) return;
    tasks.forEach((task, target) => { if (target === anchor || target.contains(anchor)) task.finish(); });
  }
  window.addEventListener('hashchange', finishAnchor);
  finishAnchor();
  reduced.addEventListener('change', event => {
    if (!event.matches) return;
    observer.disconnect(); tasks.forEach(task => task.finish());
  });
})();
