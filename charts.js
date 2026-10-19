/* Animate quantitative visuals once, and only after their plot is on screen. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !('IntersectionObserver' in window)) return;
  const tasks = new Map();
  const radar = document.querySelector('.alert-radar');
  if (radar) {
    const polygon = radar.querySelector('.radar-fill');
    const dots = [...radar.querySelectorAll('.radar-dot')];
    const target = polygon.getAttribute('points').trim().split(/\s+/).map(pair => pair.split(',').map(Number));
    const origin = [220, 140];
    const radii = target.map(([x, y]) => Math.hypot(x - origin[0], y - origin[1]));
    const reach = Math.max(1, ...radii);
    // Each spoke has its own travel time and spring. Short spokes settle first,
    // while longer ones keep pulling the connected outline into shape.
    const springs = radii.map((radius, i) => ({
      duration: radius === 0 ? 0 : 440 + 650 * radius / reach,
      delay: radius === 0 ? 0 : (i * 37) % 95,
      tension: 1.25 + (i % 3) * .36,
    }));
    const duration = Math.max(...springs.map(spring => spring.delay + spring.duration));
    function draw(elapsed) {
      const current = target.map(([x, y], i) => {
        const spring = springs[i];
        const t = spring.duration === 0 ? 1 : Math.max(0, Math.min(1, (elapsed - spring.delay) / spring.duration));
        const amount = t === 0 ? 0 : t === 1 ? 1 : 1 + (spring.tension + 1) * (t - 1) ** 3 + spring.tension * (t - 1) ** 2;
        return [origin[0] + (x - origin[0]) * amount, origin[1] + (y - origin[1]) * amount];
      });
      polygon.setAttribute('points', current.map(point => point.map(n => n.toFixed(2)).join(',')).join(' '));
      dots.forEach((dot, i) => {
        dot.setAttribute('cx', current[i][0]);
        dot.setAttribute('cy', current[i][1]);
      });
    }
    draw(0); let frame = null;
    tasks.set(radar, {
      finish() { if (frame !== null) cancelAnimationFrame(frame); draw(duration); radar.dataset.chartState = 'complete'; },
      start() {
        let started;
        function tick(now) {
          started ??= now;
          const elapsed = now - started;
          draw(elapsed);
          if (elapsed < duration) frame = requestAnimationFrame(tick);
          else { frame = null; radar.dataset.chartState = 'complete'; }
        }
        frame = requestAnimationFrame(tick);
      },
    });
  }
  document.querySelectorAll('.htb-visual,.responsibility-rows').forEach(plot => {
    const bars = [...plot.querySelectorAll('[data-htb-bar],.responsibility-fill')];
    bars.forEach(bar => { bar.style.transformOrigin = 'left center'; bar.style.transform = 'scaleX(0)'; });
    let animations = [];
    tasks.set(plot, {
      finish() { animations.forEach(animation => animation.cancel()); bars.forEach(bar => { bar.style.transform = 'scaleX(1)'; }); plot.dataset.chartState = 'complete'; },
      start() {
        if (!bars.every(bar => typeof bar.animate === 'function')) { tasks.get(plot).finish(); return; }
        animations = bars.map((bar, index) => bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 700, delay: index * 65, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }));
        Promise.all(animations.map(animation => animation.finished)).then(() => { bars.forEach(bar => { bar.style.transform = 'scaleX(1)'; }); animations.forEach(animation => animation.cancel()); plot.dataset.chartState = 'complete'; }).catch(() => {});
      },
    });
  });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || entry.intersectionRatio < .2 || entry.target.dataset.chartState !== 'waiting') return;
      observer.unobserve(entry.target);
      entry.target.dataset.chartState = 'running';
      tasks.get(entry.target).start();
    });
  }, { threshold: .2 });
  tasks.forEach((task, plot) => { plot.dataset.chartState = 'waiting'; observer.observe(plot); });
  reduced.addEventListener('change', event => {
    if (!event.matches) return;
    observer.disconnect(); tasks.forEach(task => task.finish());
  });
})();
