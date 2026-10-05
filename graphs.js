/* Page-only graphs. GitHub uses a saved daily snapshot; blog topics use the cards. */
(() => {
  'use strict';
  const ns = 'http://www.w3.org/2000/svg';
  const svgNode = (tag, attrs = {}, text) => {
    const node = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const shortDate = value => new Date(value + 'T12:00:00Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });

  const calendar = document.querySelector('[data-contribution-graph]');
  if (calendar) {
    const data = window.PORTFOLIO_CONTRIBUTIONS;
    const valid = data && Number.isInteger(data.total) && data.total >= 0 &&
      Array.isArray(data.days) && data.days.length >= 365 && data.days.length <= 367 &&
      data.days.every(day => Array.isArray(day) && /^\d{4}-\d{2}-\d{2}$/.test(day[0]) &&
        Number.isInteger(day[1]) && day[1] >= 0 && Number.isInteger(day[2]) && day[2] >= 0 && day[2] <= 4) &&
      data.days.reduce((sum, day) => sum + day[1], 0) === data.total;
    if (valid) {
      const svg = svgNode('svg', {
        viewBox: '0 0 880 157', class: 'contribution-calendar', role: 'grid',
        'aria-label': `${data.total} GitHub contributions in the last year. Use arrow keys to explore days.`,
        'aria-rowcount': '7',
      });
      const first = new Date(data.days[0][0] + 'T00:00:00Z');
      const firstWeekday = first.getUTCDay();
      const columns = Math.ceil((firstWeekday + data.days.length) / 7);
      svg.setAttribute('aria-colcount', columns);
      const detail = calendar.querySelector('[data-day-detail]');
      const rows = Array.from({ length: 7 }, (_, i) => svgNode('g', { role: 'row', 'aria-rowindex': i + 1 }));
      const cells = [];
      let active = data.days.length - 1;
      let previousMonth = '';
      data.days.forEach(([date, count, level], index) => {
        const day = new Date(date + 'T00:00:00Z');
        const weekday = day.getUTCDay();
        const column = Math.floor((index + firstWeekday) / 7);
        const x = 44 + column * 15.4;
        const month = date.slice(0, 7);
        if (month !== previousMonth) {
          svg.append(svgNode('text', { x, y: 14, class: 'graph-axis', 'aria-hidden': 'true' },
            day.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })));
          previousMonth = month;
        }
        const label = `${shortDate(date)}: ${count} contribution${count === 1 ? '' : 's'}`;
        const cell = svgNode('rect', {
          x, y: 26 + weekday * 15.4, width: 11.5, height: 11.5, rx: 2.5,
          class: `contribution-day contribution-level-${level}`, role: 'gridcell',
          'aria-label': label, 'aria-colindex': column + 1,
          tabindex: index === active ? 0 : -1,
        });
        cell.append(svgNode('title', {}, label));
        const show = () => {
          cells[active]?.setAttribute('tabindex', '-1');
          active = index;
          cell.setAttribute('tabindex', '0');
          detail.textContent = label;
        };
        cell.addEventListener('pointerenter', show);
        cell.addEventListener('focus', show);
        cell.addEventListener('click', show);
        cell.addEventListener('keydown', event => {
          const offsets = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
          let next;
          if (event.key in offsets) next = Math.max(0, Math.min(cells.length - 1, index + offsets[event.key]));
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = cells.length - 1;
          if (next !== undefined) { event.preventDefault(); cells[next].focus(); }
        });
        cells.push(cell);
        rows[weekday].append(cell);
      });
      ['Mon', 'Wed', 'Fri'].forEach((label, index) => {
        svg.append(svgNode('text', { x: 0, y: 50 + index * 30.8, class: 'graph-axis', 'aria-hidden': 'true' }, label));
      });
      rows.forEach(row => svg.append(row));
      const plot = calendar.querySelector('[data-calendar-plot]');
      plot.replaceChildren(svg);
      plot.scrollLeft = Math.max(0, plot.scrollWidth - plot.clientWidth);
      calendar.querySelector('[data-contribution-total]').textContent = Number(data.total).toLocaleString('en-US');
      const updated = new Date(data.updatedAt);
      if (!Number.isNaN(updated.getTime())) {
        calendar.querySelector('[data-calendar-updated]').textContent = 'Updated ' + updated.toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', timeZone: 'America/New_York',
        });
      }
    }
  }

  const constellation = document.querySelector('[data-topic-graph]');
  if (constellation) {
    const cards = [...document.querySelectorAll('.work-card[data-topic-group]')];
    const groups = new Map();
    cards.forEach(card => {
      const name = card.dataset.topicGroup;
      if (!groups.has(name)) groups.set(name, { cards: [], topics: new Map() });
      const group = groups.get(name);
      group.cards.push(card);
      card.dataset.topics.split('|').filter(Boolean).forEach(topic => {
        if (!group.topics.has(topic)) group.topics.set(topic, card);
      });
    });
    if (!groups.size) return;
    const svg = svgNode('svg', {
      viewBox: '0 0 880 213', class: 'topic-constellation',
      role: 'group', 'aria-label': 'Blog topic constellation. Select a topic to jump to its field note.',
    });
    const lines = svgNode('g', { class: 'constellation-lines', 'aria-hidden': 'true' });
    const nodes = svgNode('g');
    svg.append(lines, nodes);
    const root = { x: 440, y: 185 };
    const connect = (a, b, curved = false) => {
      lines.append(svgNode('path', {
        d: curved ? `M${a.x},${a.y} Q${a.x},${b.y} ${b.x},${b.y}` : `M${a.x},${a.y} L${b.x},${b.y}`,
      }));
    };
    const addNode = (point, label, groupIndex, card, hub = false) => {
      const attrs = { class: `topic-node topic-tone-${groupIndex % 3}${hub ? ' topic-hub' : ''}` };
      if (card) { attrs.href = '#' + card.id; attrs['aria-label'] = `${label}: jump to ${card.querySelector('h2').textContent.trim()}`; }
      const node = svgNode(card ? 'a' : 'g', attrs);
      if (card) node.append(svgNode('rect', { x: point.x - 55, y: point.y - 15, width: 110, height: 49, fill: 'transparent' }));
      if (hub) node.append(svgNode('circle', { cx: point.x, cy: point.y, r: 15, class: 'topic-halo' }));
      node.append(svgNode('circle', { cx: point.x, cy: point.y, r: hub ? 5 : 3.5, class: 'topic-dot' }));
      node.append(svgNode('text', { x: point.x, y: point.y + (hub ? 27 : 20), 'text-anchor': 'middle' }, label));
      if (card) {
        node.append(svgNode('title', {}, `${label} · ${card.querySelector('h2').textContent.trim()}`));
        node.addEventListener('click', event => {
          event.preventDefault();
          cards.forEach(item => item.classList.toggle('topic-selected', item === card));
          history.pushState(null, '', '#' + card.id);
          card.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
          card.querySelector('h2 a').focus({ preventScroll: true });
        });
      }
      nodes.append(node);
    };
    let topicCount = 1;
    [...groups.entries()].forEach(([name, group], index) => {
      const width = 880 / groups.size;
      const hub = { x: width * (index + .5), y: 81 };
      connect(hub, root, true);
      addNode(hub, name, index, group.cards[0], true);
      const topics = [...group.topics.entries()];
      topics.forEach(([topic, card], i) => {
        const positions = [
          { x: hub.x - width * .3, y: 27 },
          { x: hub.x + width * .3, y: 27 },
          { x: hub.x + width * .3 * (index === 0 ? -1 : 1), y: 154 },
        ];
        const topCount = Math.ceil(topics.length / 2);
        const rowCount = i < topCount ? topCount : topics.length - topCount;
        const rowIndex = i < topCount ? i : i - topCount;
        const point = topics.length <= 3 ? positions[i] : {
          x: hub.x + width * .62 * ((rowIndex + .5) / rowCount - .5),
          y: i < topCount ? 27 : 154,
        };
        connect(hub, point);
        addNode(point, topic, index, card);
        topicCount += 1;
      });
      topicCount += 1;
    });
    addNode(root, 'Security', 1, null, false);
    constellation.querySelector('[data-topic-plot]').replaceChildren(svg);
    constellation.querySelector('[data-topic-summary]').textContent = `${cards.length} field notes · ${topicCount} connected topics`;
  }
})();
