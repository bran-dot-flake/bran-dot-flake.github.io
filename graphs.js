/* Page-only indexes: project outcomes and the blog topic constellation. */
(() => {
  'use strict';
  const ns = 'http://www.w3.org/2000/svg';
  const svgNode = (tag, attrs = {}, text) => {
    const node = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (text !== undefined) node.textContent = text;
    return node;
  };
  // The evidence index includes every project card. Outcomes live on the cards;
  // the static index is a no-JavaScript fallback for the same links and results.
  const evidenceBoard = document.querySelector('[data-project-evidence]');
  if (evidenceBoard) {
    const cards = [...document.querySelectorAll('.work-grid > .work-card')];
    const element = (tag, className, text) => {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const preview = card => {
      const artifact = element('div', 'evidence-artifact');
      artifact.setAttribute('aria-hidden', 'true');
      const type = card.dataset.evidencePreview;
      const labels = { pipeline: 'WORKFLOW TRACE / ELAPSED TIME', ioc: 'BATCH ENRICHMENT / EXPORT',
        packets: 'INVESTIGATION FILES', azure: 'SENTINEL / GEOIP WORKBOOK' };
      artifact.append(element('span', 'evidence-artifact-label', labels[type] || 'PROJECT OVERVIEW'));
      if (type === 'pipeline') {
        const flow = element('div', 'evidence-flow');
        [['VirusTotal', '1.409 s'], ['TheHive', '2.565 s'], ['Email', '2.905 s']].forEach(([name, time], i) => {
          if (i) flow.append(element('b', '', '→'));
          const stage = element('span', '', name);
          stage.append(element('small', '', time)); flow.append(stage);
        });
        artifact.append(flow);
      } else if (type === 'ioc') {
        artifact.append(element('code', 'evidence-command', 'python ioc_analyzer.py --file iocs.txt --json --csv'));
      } else if (type === 'packets') {
        const files = element('div', 'evidence-cases');
        ['HTTP', 'Nmap', 'TCP/53', 'IPv4', 'SMB3', 'Kerberos', 'TLS'].forEach((name, i) => {
          const file = element('span');
          file.append(element('small', '', String(i + 1).padStart(2, '0')), document.createTextNode(name));
          files.append(file);
        });
        artifact.append(files);
      } else {
        const image = element('img', 'evidence-map');
        image.src = type === 'azure' ? 'assets/evidence-azure-map.png' : card.querySelector('.card-image img')?.getAttribute('src') || 'assets/pipeline.svg';
        image.alt = ''; image.width = 560; image.height = 72;
        artifact.append(image);
      }
      return artifact;
    };
    const links = cards.map((card, i) => {
      const fullName = card.querySelector('h2').textContent.trim();
      if (!card.id) {
        const base = 'project-' + fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        let id = base, suffix = 2;
        while (document.getElementById(id)) id = `${base}-${suffix++}`;
        card.id = id;
      }
      card.classList.add('project-evidence-card');
      card.dataset.evidenceTone ||= String(i % 4);
      const label = card.dataset.evidenceLabel || fullName;
      const result = card.dataset.evidenceResult || 'Project notes';
      const caption = card.dataset.evidenceCaption || 'process & outcome';
      const outcome = card.dataset.evidenceOutcome || card.querySelector('.card-body > p:not(.card-category)')?.textContent.trim() || 'Explore the project and its documented process.';
      const link = element('a', 'evidence-item');
      link.href = '#' + card.id;
      link.dataset.evidenceTone = card.dataset.evidenceTone;
      link.setAttribute('aria-label', `${fullName}: ${result} ${caption}. Jump to project.`);
      const head = element('div', 'evidence-item-head');
      head.append(element('span', 'evidence-project-name', label), element('span', 'evidence-item-number', String(i + 1).padStart(2, '0')));
      const metric = element('div', 'evidence-result');
      metric.append(element('strong', '', result), element('span', '', caption));
      const detail = element('div', 'evidence-preview-region');
      detail.append(element('p', 'evidence-outcome', outcome), preview(card));
      const footer = element('div', 'evidence-item-footer');
      const action = element('span', '', 'View project '), arrow = element('b', '', '↓');
      arrow.setAttribute('aria-hidden', 'true'); action.append(arrow);
      footer.append(element('span', '', card.dataset.evidenceKind || 'PROJECT'), action);
      link.append(head, metric, detail, footer);
      link.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        if (location.hash !== '#' + card.id) history.pushState(null, '', '#' + card.id);
        select(card.id);
        card.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        card.querySelector('h2 a').focus({ preventScroll: true });
      });
      return link;
    });
    function select(id) {
      cards.forEach((card, i) => {
        const active = card.id === id;
        card.classList.toggle('topic-selected', active);
        if (active) links[i].setAttribute('aria-current', 'true');
        else links[i].removeAttribute('aria-current');
      });
    }
    const selectHash = () => {
      try { select(decodeURIComponent(location.hash.slice(1))); }
      catch (_) { select(''); }
    };
    evidenceBoard.querySelector('[data-evidence-grid]').replaceChildren(...links);
    evidenceBoard.querySelector('[data-evidence-count]').textContent = `${cards.length} project${cards.length === 1 ? '' : 's'}`;
    window.addEventListener('hashchange', selectHash);
    window.addEventListener('popstate', selectHash);
    selectHash();
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
    // Give each subject its own cluster. Two rows keep the growing collection
    // legible; its labels and links come directly from the field-note cards.
    const columns = Math.min(3, groups.size);
    const rows = Math.ceil(groups.size / columns);
    const width = 1080, rowHeight = 200, height = rows * rowHeight + 32;
    const svg = svgNode('svg', {
      viewBox: `0 0 ${width} ${height}`, class: 'topic-constellation',
      role: 'group', 'aria-label': 'Blog topic constellation. Select a topic to jump to its field note.',
    });
    const lines = svgNode('g', { class: 'constellation-lines', 'aria-hidden': 'true' });
    const nodes = svgNode('g');
    svg.append(lines, nodes);
    const root = { x: width / 2, y: rows > 1 ? 208 : 179 };
    const connect = (a, b) => {
      lines.append(svgNode('path', { d: `M${a.x},${a.y} L${b.x},${b.y}` }));
    };
    const addNode = (point, label, groupIndex, card, hub = false) => {
      const attrs = { class: `topic-node topic-tone-${groupIndex % 5}${hub ? ' topic-hub' : ''}` };
      if (card) { attrs.href = '#' + card.id; attrs['aria-label'] = `${label}: jump to ${card.querySelector('h2').textContent.trim()}`; }
      const node = svgNode(card ? 'a' : 'g', attrs);
      if (card) node.append(svgNode('rect', { x: point.x - 60, y: point.y - 15, width: 120, height: 49, fill: 'transparent' }));
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
    const uniqueTopics = new Set();
    [...groups.entries()].forEach(([name, group], index) => {
      const row = Math.floor(index / columns);
      const count = Math.min(columns, groups.size - row * columns);
      const cellWidth = width / count;
      const hub = { x: cellWidth * (index % columns + .5), y: row === 0 ? 132 : 285 + (row - 1) * rowHeight };
      connect(hub, root);
      addNode(hub, name, index, group.cards[0], true);
      const allTopics = [...group.topics.entries()];
      allTopics.forEach(([topic]) => uniqueTopics.add(topic));
      const topics = allTopics.slice(0, 6);
      topics.forEach(([topic, card], i) => {
        const tier = Math.floor(i / 3), tierSize = Math.min(3, topics.length - tier * 3);
        const point = {
          x: hub.x + (i % 3 - (tierSize - 1) / 2) * 106,
          y: row === 0 ? 34 + tier * 44 : hub.y + 60 + tier * 44,
        };
        connect(hub, point);
        addNode(point, topic, index, card);
        uniqueTopics.add(topic);
      });
    });
    addNode(root, 'Security', 1, null, false);
    constellation.querySelector('[data-topic-plot]').replaceChildren(svg);
    constellation.querySelector('[data-topic-summary]').textContent = `${cards.length} field notes · ${groups.size} areas · ${uniqueTopics.size} topics`;
  }
})();
