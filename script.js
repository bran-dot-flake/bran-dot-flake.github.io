const root = document.documentElement;
const toggles = document.querySelectorAll('.theme-toggle');
function syncTheme() {
  const light = root.dataset.theme === 'light';
  toggles.forEach(button => {
    button.setAttribute('aria-pressed', String(light));
    button.setAttribute('aria-label', `Switch to ${light ? 'dark' : 'light'} mode`);
    const label = button.querySelector('.theme-label');
    if (label) label.textContent = light ? 'Dark mode' : 'Light mode';
    button.querySelector('.theme-glyph').textContent = light ? '☾' : '☼';
  });
  document.querySelector('meta[name="theme-color"]').content = light ? '#fdf6e3' : '#101919';
}
toggles.forEach(button => button.addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
  try { localStorage.setItem('brandon-theme', root.dataset.theme); } catch (e) {}
  syncTheme();
}));
syncTheme();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const sequence = [
  { command: 'whoami', output: 'brandon\nIT specialist → security operations' },
  { command: 'ls investigations/', output: 'wireshark/  soc-pipeline/  ioc-analyzer/' },
  { command: 'cat focus.txt', output: 'Incident response\nDetection engineering\nNetwork and host analysis' },
  { command: 'echo $STATUS', output: 'CURIOUS. INVESTIGATING. BUILDING.' }
];
const terminalCommand = document.getElementById('terminal-command');
const terminalOutput = document.getElementById('terminal-output');
if (!reducedMotion.matches && terminalCommand && terminalOutput) {
  let item = 0;
  const cycle = () => {
    const current = sequence[item];
    terminalCommand.textContent = '';
    terminalOutput.textContent = '';
    let char = 0;
    const type = () => {
      if (char < current.command.length) {
        terminalCommand.textContent += current.command.charAt(char++);
        setTimeout(type, 65);
      } else {
        setTimeout(() => {
          terminalOutput.textContent = current.output;
          item = (item + 1) % sequence.length;
          setTimeout(cycle, 2500);
        }, 320);
      }
    };
    type();
  };
  cycle();
} else if (terminalOutput) {
  terminalOutput.textContent = sequence[0].output;
}

const revealElements = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  root.classList.add('has-motion');
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px 80px 0px' });
  revealElements.forEach(element => revealObserver.observe(element));
} else {
  revealElements.forEach(element => element.classList.add('active'));
}

const navLinks = document.querySelectorAll('.nav-links a, .mobile-links a');
const sections = document.querySelectorAll('#recent, #projects, #about, #skills, #contact');
let navUpdatePending = false;
function updateActiveNav() {
  navUpdatePending = false;
  let activeId = 'top';
  if (window.scrollY > 10) {
    const marker = window.scrollY + Math.min(window.innerHeight * .35, 240);
    sections.forEach(section => {
      if (section.getBoundingClientRect().top + window.scrollY <= marker) activeId = section.id;
    });
  }
  navLinks.forEach(link => {
    const active = link.getAttribute('href') === `#${activeId}`;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
function scheduleNavUpdate() {
  if (navUpdatePending) return;
  navUpdatePending = true;
  requestAnimationFrame(updateActiveNav);
}
window.addEventListener('scroll', scheduleNavUpdate, { passive: true });
window.addEventListener('resize', scheduleNavUpdate, { passive: true });
window.addEventListener('hashchange', scheduleNavUpdate);
updateActiveNav();

const skillCards = document.querySelectorAll('.skill-card');
const mobileSkills = window.matchMedia('(max-width: 700px)');
function setSkillLayout() {
  if (mobileSkills.matches) skillCards.forEach((card, index) => { card.open = index === 0; });
  else skillCards.forEach(card => { card.open = true; });
}
setSkillLayout();
mobileSkills.addEventListener('change', setSkillLayout);

const canvas = document.getElementById('network-bg');
const ctx = canvas?.getContext('2d');
if (ctx && !reducedMotion.matches) {
  const dots = Array.from({ length: 10 }, () => ({ x: Math.random(), y: Math.random(), dx: (Math.random() - .5) * .00014, dy: (Math.random() - .5) * .00014 }));
  function resize() { canvas.width = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2); canvas.height = window.innerHeight * Math.min(window.devicePixelRatio || 1, 2); }
  window.addEventListener('resize', resize, { passive: true }); resize();
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const light = root.dataset.theme === 'light';
    const color = light ? '163, 75, 20' : '105, 210, 166';
    dots.forEach(dot => {
      dot.x += dot.dx; dot.y += dot.dy;
      if (dot.x < 0 || dot.x > 1) dot.dx *= -1;
      if (dot.y < 0 || dot.y > 1) dot.dy *= -1;
      const x = dot.x * canvas.width, y = dot.y * canvas.height;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 28);
      gradient.addColorStop(0, `rgba(${color}, .16)`);
      gradient.addColorStop(1, `rgba(${color}, 0)`);
      ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(x, y, 28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(${color}, .5)`; ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}
