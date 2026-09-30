(() => {
  'use strict';
  // Public board demonstration: synthetic in-memory data, no production API.
  const labels = { document: 'UNTERLAGE', evidence: 'BELEG', note: 'NOTIZ', hypothesis: 'ARBEITSHYPOTHESE' };
  const states = { open: 'Offen', review: 'In Prüfung', confirmed: 'Abgeglichen', question: 'Widerspruch offen' };
  const markerColors = { red: '#ed5454', orange: '#ee983d', yellow: '#eed846', green: '#64bb79', blue: '#599edf', purple: '#a183d8', pink: '#e184b7' };
  const catalog = [
    { id: 'ARC-DEMO-01', title: 'Technisches Abrufprotokoll', body: 'Zeitstempel und Abrufweg eines erfundenen Vorgangs.', phase: 'A' },
    { id: 'ARC-DEMO-02', title: 'Vertragsnotiz', body: 'Neutraler Nachtrag zur zeitlichen Einordnung.', phase: 'B' },
    { id: 'ARC-DEMO-03', title: 'Transportvermerk', body: 'Beispielhafte Transportdaten ohne Falllösung.', phase: 'C' }
  ];
  const state = {
    entries: [
      { id: 'd1', kind: 'document', title: catalog[0].title, body: catalog[0].body, phase: 'A', author: 'Teilnahme 01', status: 'review', x: 120, y: 115, catalogId: catalog[0].id },
      { id: 'e1', kind: 'evidence', title: 'Abrufzeit belegen', body: 'Markierung auf Seite 1. Ein Abgleich mit einer zweiten Quelle steht noch aus.', phase: 'A', author: 'Teilnahme 02', status: 'review', color: 'yellow', reference: { asset: catalog[0].id, page: 1, rect: { x: .09, y: .36, width: .68, height: .09 } }, x: 470, y: 115 },
      { id: 'n1', kind: 'note', title: 'Zeitfolge prüfen', body: 'Der Zeitpunkt sollte mit einer unabhängigen Quelle verglichen werden.', phase: 'A', author: 'Teilnahme 02', status: 'open', x: 510, y: 430 },
      { id: 'h1', kind: 'hypothesis', title: 'Möglicher Zusammenhang', body: 'Noch keine gesicherte Aussage. Die Verbindung bleibt eine Arbeitshypothese.', phase: 'A', author: 'Teilnahme 01', status: 'question', x: 900, y: 175 }
    ],
    links: [{ id: 'l1', from: 'd1', to: 'e1', title: 'Stelle belegt' }, { id: 'l2', from: 'e1', to: 'h1', title: 'möglicher Zeitbezug' }],
    history: [], selected: null, connecting: false, linkFrom: null, nextId: 2,
    scale: .8, tx: 20, ty: 0, panel: null, readerEntry: null, marking: false, markerColor: 'yellow', markerSelection: null, readerZoom: 1, lastClick: null
  };
  const $ = (selector) => document.querySelector(selector);
  const E = (tag, content, cls) => { const el = document.createElement(tag); if (content !== undefined) el.textContent = content; if (cls) el.className = cls; return el; };
  const B = (content, action, cls) => { const el = E('button', content, cls); el.type = 'button'; el.addEventListener('click', action); return el; };
  const norm = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const snapshot = () => JSON.stringify({ entries: state.entries, links: state.links, nextId: state.nextId });
  const status = (message) => { $('#board-status').textContent = message; };
  function record(before, label) {
    state.history.unshift({ before, label });
    state.history.length = Math.min(state.history.length, 20);
    status('Demo aktualisiert · ' + label + ' · nicht servergespeichert');
  }
  function mutate(label, fn) { const before = snapshot(); fn(); record(before, label); render(); }
  function hidePanel() { $('#board-panel').hidden = true; $('#board-panel').replaceChildren(); state.panel = null; requestAnimationFrame(fit); }
  function panelShell(title, explanation) {
    hidePanel();
    const panel = $('#board-panel');
    panel.hidden = false;
    panel.append(E('h3', title));
    if (explanation) panel.append(E('p', explanation));
    state.panel = title;
    requestAnimationFrame(fit);
    return panel;
  }
  function field(title, type, value = '') {
    const label = E('label', title, 'demo-field');
    const input = E(type === 'textarea' ? 'textarea' : 'input');
    if (type !== 'textarea') input.type = type;
    input.value = value;
    label.append(input);
    return { label, input };
  }
  function nextPosition() {
    if (state.lastClick) {
      const point = state.lastClick;
      state.lastClick = null;
      return point;
    }
    for (const y of [100, 430, 760, 1090]) for (const x of [120, 470, 820, 1170]) {
      const free = state.entries.every((entry) =>
        x + 276 < entry.x || entry.x + 276 < x || y + 460 < entry.y || entry.y + (entry.kind === 'document' ? 460 : 280) < y
      );
      if (free) return { x, y };
    }
    return { x: 120 + state.entries.length * 320, y: 100 };
  }
  function positionNear(source) {
    const candidates = [
      { x: source.x + 300, y: source.y },
      { x: source.x, y: source.y + 470 },
      { x: source.x + 300, y: source.y + 470 }
    ];
    for (const candidate of candidates) {
      const free = state.entries.every((entry) =>
        candidate.x + 246 < entry.x || entry.x + 246 < candidate.x || candidate.y + 250 < entry.y || entry.y + (entry.kind === 'document' ? 430 : 250) < candidate.y
      );
      if (free) return candidate;
    }
    return nextPosition();
  }
  function openCatalog() {
    const panel = panelShell('Unterlage anheften', 'Nur neutrale, für diese Demo freigegebene Unterlagen. Die Originalanwendung durchsucht den freigegebenen Archivbestand.');
    const search = field('Unterlagen durchsuchen', 'search');
    search.input.placeholder = 'Dateicode oder Titel';
    const count = E('p');
    const results = E('div', undefined, 'demo-panel-list');
    panel.append(search.label, count, results, B('Schließen', hidePanel));
    const update = () => {
      const match = catalog.filter((item) => norm([item.id, item.title, item.body].join(' ')).includes(norm(search.input.value)));
      count.textContent = match.length + ' Treffer · ' + catalog.length + ' freigegebene Unterlagen';
      results.replaceChildren();
      for (const item of match) {
        const exists = state.entries.some((entry) => entry.catalogId === item.id);
        const button = B(item.title, () => {
          const pos = nextPosition();
          mutate('Unterlage angeheftet', () => state.entries.push({ id: 'd' + state.nextId++, kind: 'document', title: item.title, body: item.body, phase: item.phase, author: 'Teilnahme 01', status: 'open', catalogId: item.id, ...pos }));
          hidePanel();
          fit();
        }, 'eb-catalog');
        button.disabled = exists;
        button.append(E('small', item.id + ' · Bereich ' + item.phase + (exists ? ' · bereits angeheftet' : '')));
        results.append(button);
      }
      if (!match.length) results.append(E('p', 'Keine passende Unterlage.'));
    };
    search.input.addEventListener('input', update);
    update();
    search.input.focus();
  }
  function openForm(kind, item = null) {
    const panel = panelShell(item ? 'Eintrag bearbeiten' : 'Neuer Eintrag', 'Dieser Eintrag wird im lokal simulierten Ermittlungsbestand abgelegt.');
    const title = field('Titel', 'text', item?.title ?? '');
    const body = field('Inhalt', 'textarea', item?.body ?? '');
    title.input.maxLength = 140;
    body.input.maxLength = 4000;
    const work = E('select');
    for (const [value, label] of Object.entries(states)) { const option = E('option', label); option.value = value; work.append(option); }
    work.value = item?.status || 'open';
    const workLabel = E('label', 'Gemeinsamer Arbeitsstand', 'demo-field');
    workLabel.append(work);
    panel.append(title.label, body.label, workLabel);
    let documentSelect = null, pageInput = null;
    if (!item && state.entries.some((entry) => entry.kind === 'document')) {
      documentSelect = E('select');
      const empty = E('option', 'Ohne Belegstelle'); empty.value = ''; documentSelect.append(empty);
      for (const documentEntry of state.entries.filter((entry) => entry.kind === 'document')) {
        const option = E('option', documentEntry.title); option.value = documentEntry.catalogId; documentSelect.append(option);
      }
      const documentLabel = E('label', 'Bezug zu einer angehefteten Unterlage', 'demo-field'); documentLabel.append(documentSelect);
      pageInput = E('input'); pageInput.type = 'number'; pageInput.min = '1'; pageInput.max = '1'; pageInput.value = '1'; pageInput.disabled = true;
      documentSelect.addEventListener('change', () => { pageInput.disabled = !documentSelect.value; });
      const pageLabel = E('label', 'Seite', 'demo-field'); pageLabel.append(pageInput);
      panel.append(documentLabel, pageLabel);
    }
    const actions = E('div', undefined, 'demo-actions');
    actions.append(B('Speichern', () => {
      const text = title.input.value.trim();
      if (!text) { title.input.focus(); return; }
      if (item) mutate('Eintrag geändert', () => { item.title = text; item.body = body.input.value.trim(); item.status = work.value; });
      else {
        const pos = nextPosition();
        const reference = documentSelect?.value ? { asset: documentSelect.value, page: Number(pageInput.value) || 1 } : null;
        mutate(kind === 'note' ? 'Notiz angelegt' : 'Hypothese angelegt', () => state.entries.push({ id: (kind === 'note' ? 'n' : 'h') + state.nextId++, kind, title: text, body: body.input.value.trim(), phase: 'A', author: 'Teilnahme 01', status: work.value, ...(reference ? { reference } : {}), ...pos }));
      }
      hidePanel();
      if (!item) fit();
    }), B('Abbrechen', hidePanel));
    if (item?.reference) panel.append(E('p', 'Belegstelle: Seite ' + item.reference.page + ' · ' + item.reference.asset));
    panel.append(actions);
    title.input.focus();
  }
  function openConnection(from, to, item = null) {
    const panel = panelShell('Beziehung beschriften', 'Die Verbindung kennzeichnet einen begründeten Zusammenhang, keinen automatisch gesicherten Befund.');
    const title = field('Beziehung', 'text', item?.title || 'möglicher Zusammenhang');
    panel.append(title.label);
    const actions = E('div', undefined, 'demo-actions');
    actions.append(B('Speichern', () => {
      if (!title.input.value.trim()) { title.input.focus(); return; }
      if (item) mutate('Verbindung bearbeitet', () => { item.title = title.input.value.trim(); });
      else mutate('Verbindung hergestellt', () => state.links.push({ id: 'l' + state.nextId++, from, to, title: title.input.value.trim() }));
      hidePanel();
    }), B('Abbrechen', hidePanel));
    panel.append(actions);
    title.input.focus();
  }
  function openHistory() {
    const panel = panelShell('Änderungsprotokoll', 'Eigene, noch unveränderte Demo-Aktionen können rückgängig gemacht werden.');
    const list = E('div', undefined, 'demo-panel-list');
    panel.append(list);
    if (!state.history.length) list.append(E('p', 'Noch keine eigenen Änderungen.'));
    for (const [index, event] of state.history.entries()) {
      const row = E('div', undefined, 'history-item');
      row.append(E('strong', event.label), E('small', index === 0 ? 'Letzte eigene Änderung' : 'Frühere Änderung'));
      if (index === 0) row.append(B('Rückgängig', () => {
        const old = JSON.parse(state.history.shift().before);
        state.entries = old.entries;
        state.links = old.links;
        state.nextId = old.nextId;
        state.selected = null;
        render();
        openHistory();
        status('Letzte eigene Änderung rückgängig gemacht');
      }));
      list.append(row);
    }
    panel.append(B('Schließen', hidePanel));
  }
  function matches(entry) {
    const filter = $('#board-filter').value;
    const terms = norm($('#board-search').value).trim().split(/\s+/).filter(Boolean);
    const text = norm([entry.title, entry.body, entry.author, labels[entry.kind], states[entry.status]].join(' '));
    return (!filter || entry.status === filter) && terms.every((term) => text.includes(term));
  }
  function openResults() {
    const panel = panelShell('Treffer im Board');
    const list = state.entries.filter(matches);
    panel.append(E('p', list.length + ' Treffer im gemeinsamen Bestand.'));
    const results = E('div', undefined, 'demo-panel-list');
    for (const entry of list) {
      const button = B(entry.title, () => { hidePanel(); focusEntry(entry); }, 'eb-catalog');
      button.append(E('small', labels[entry.kind] + ' · ' + states[entry.status]));
      results.append(button);
    }
    if (!list.length) results.append(E('p', 'Keine Treffer. Suche oder Filter ändern.'));
    panel.append(results, B('Schließen', hidePanel));
  }
  function selectEntry(entry) {
    state.selected = entry.id;
    if (state.connecting) {
      if (!state.linkFrom) { state.linkFrom = entry.id; status('Jetzt einen zweiten Beleg wählen.'); }
      else if (state.linkFrom !== entry.id) {
        const from = state.linkFrom;
        state.connecting = false;
        state.linkFrom = null;
        $('#tool-connect').classList.remove('active');
        openConnection(from, entry.id);
      }
    }
    renderSelection();
  }
  function renderSelection() { document.querySelectorAll('.eb-node').forEach((node) => node.classList.toggle('selected', node.dataset.id === state.selected)); }
  function documentImage(entry) {
    const original = catalog.find((item) => item.id === (entry.catalogId || entry.reference?.asset)) || catalog[0];
    const escaped = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
    const lines = original.body.match(/.{1,46}(?:\s|$)/g) || [original.body];
    const body = lines.map((line, index) => `<text x="55" y="${317 + index * 24}" fill="#35483e" font-family="Georgia,serif" font-size="15">${escaped(line.trim())}</text>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 820"><rect width="600" height="820" fill="#f4f3eb"/><text x="55" y="68" fill="#315047" font-family="monospace" font-size="12" letter-spacing="3">ARCHIVE RECOVERY / DEMO</text><path d="M55 85H545" stroke="#9aa99b"/><text x="55" y="152" fill="#20382e" font-family="Georgia,serif" font-size="27">${escaped(original.title)}</text><text x="55" y="190" fill="#64766b" font-family="monospace" font-size="12">${escaped(original.id)} · BEISPIELDOKUMENT · SEITE 1/1</text><text x="55" y="278" fill="#263d33" font-family="Georgia,serif" font-size="18">01 / Synthetischer Auszug</text>${body}<path d="M55 548H545" stroke="#c0cbbd"/><text x="55" y="585" fill="#64766b" font-family="monospace" font-size="11">FIKTIVE TESTDATEN · KEIN TEIL DES SPIELVORGANGS</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function documentPreview(entry) {
    const image = E('img', undefined, 'eb-doc-image');
    image.src = documentImage(entry);
    image.alt = entry.title + ', Beispielseite 1';
    image.draggable = false;
    image.tabIndex = 0;
    image.setAttribute('aria-label', entry.title + ' öffnen');
    image.addEventListener('click', (event) => { event.stopPropagation(); if (state.connecting) selectEntry(entry); else openReader(entry); });
    image.addEventListener('keydown', (event) => { if (event.key === 'Enter') { if (state.connecting) selectEntry(entry); else openReader(entry); } });
    return image;
  }
  function renderEntries() {
    const layer = $('#board-nodes');
    layer.replaceChildren();
    state.entries.forEach((entry, index) => {
      const card = E('article', undefined, 'eb-node ' + entry.kind);
      card.dataset.id = entry.id;
      card.style.left = entry.x + 'px';
      card.style.top = entry.y + 'px';
      card.classList.toggle('eb-dimmed', !matches(entry));
      card.setAttribute('aria-label', entry.title);
      const head = E('header');
      head.tabIndex = 0;
      head.setAttribute('aria-label', entry.title + ' verschieben');
      head.append(E('small', labels[entry.kind]), E('span', String(index + 1).padStart(2, '0')));
      attachDrag(head, card, entry);
      card.append(head, E('h3', entry.title));
      if (entry.kind === 'document') card.append(documentPreview(entry));
      else card.append(E('p', entry.body));
      if (entry.reference) {
        const citation = B('Belegstelle · Seite ' + entry.reference.page, (event) => { event.stopPropagation(); openReader(entry); }, 'eb-citation');
        card.append(citation);
      }
      const select = E('select', undefined, 'eb-work-status');
      select.setAttribute('aria-label', 'Arbeitsstatus: ' + entry.title);
      select.title = 'Arbeitsstand — kein automatisches Prüfergebnis';
      for (const [value, label] of Object.entries(states)) { const option = E('option', label); option.value = value; select.append(option); }
      select.value = entry.status;
      select.addEventListener('click', (event) => event.stopPropagation());
      select.addEventListener('change', () => mutate('Arbeitsstatus geändert', () => { entry.status = select.value; }));
      card.append(select);
      const footer = E('footer');
      footer.append(E('span', entry.author), E('span', 'BEREICH ' + entry.phase));
      card.append(footer);
      card.addEventListener('click', () => selectEntry(entry));
      card.addEventListener('dblclick', (event) => { if (entry.kind !== 'document' && event.target.tagName !== 'SELECT') openForm(entry.kind, entry); });
      layer.append(card);
    });
    renderSelection();
  }
  function attachDrag(head, card, entry) {
    head.addEventListener('pointerdown', (event) => {
      if (state.connecting) return;
      event.preventDefault();
      event.stopPropagation();
      selectEntry(entry);
      const before = snapshot();
      const start = { x: event.clientX, y: event.clientY, ix: entry.x, iy: entry.y };
      let moved = false;
      head.setPointerCapture(event.pointerId);
      const move = (next) => {
        const dx = (next.clientX - start.x) / state.scale;
        const dy = (next.clientY - start.y) / state.scale;
        moved ||= Math.abs(dx) + Math.abs(dy) > 3;
        entry.x = Math.max(0, Math.round(start.ix + dx));
        entry.y = Math.max(0, Math.round(start.iy + dy));
        card.style.left = entry.x + 'px';
        card.style.top = entry.y + 'px';
        drawLines();
      };
      const end = () => {
        head.removeEventListener('pointermove', move);
        head.removeEventListener('pointerup', end);
        head.removeEventListener('pointercancel', end);
        if (moved) { record(before, 'Karte verschoben'); render(); }
      };
      head.addEventListener('pointermove', move);
      head.addEventListener('pointerup', end);
      head.addEventListener('pointercancel', end);
    });
    head.addEventListener('keydown', (event) => {
      const vector = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[event.key];
      if (!vector) return;
      event.preventDefault();
      mutate('Karte verschoben', () => { entry.x = Math.max(0, entry.x + vector[0]); entry.y = Math.max(0, entry.y + vector[1]); });
    });
  }
  function drawLines() {
    const svg = $('#board-wires');
    const labelsLayer = $('#board-labels');
    svg.replaceChildren();
    labelsLayer.replaceChildren();
    for (const link of state.links) {
      const from = state.entries.find((entry) => entry.id === link.from);
      const to = state.entries.find((entry) => entry.id === link.to);
      if (!from || !to) continue;
      const fromNode = document.querySelector('.eb-node[data-id="' + from.id + '"]');
      const toNode = document.querySelector('.eb-node[data-id="' + to.id + '"]');
      if (!fromNode || !toNode) continue;
      const ax = from.x + 123, ay = from.y + fromNode.offsetHeight / 2;
      const bx = to.x + 123, by = to.y + toNode.offsetHeight / 2;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      for (const [key, value] of Object.entries({ x1: ax, y1: ay, x2: bx, y2: by })) line.setAttribute(key, String(value));
      svg.append(line);
      const label = B(link.title, () => openConnection(link.from, link.to, link), 'eb-link-label');
      label.style.left = (ax + bx) / 2 + 'px';
      label.style.top = (ay + by) / 2 + 'px';
      labelsLayer.append(label);
    }
  }
  function render() {
    renderEntries();
    drawLines();
    const matchCount = state.entries.filter(matches).length;
    $('#board-count').textContent = ($('#board-search').value || $('#board-filter').value ? matchCount + ' TREFFER · ' : '') + state.entries.length + ' EINTRÄGE · ' + state.links.length + (state.links.length === 1 ? ' VERKNÜPFUNG' : ' VERKNÜPFUNGEN');
  }
  function transform() {
    $('#board-world').style.transform = `translate(${state.tx}px,${state.ty}px) scale(${state.scale})`;
    $('#zoom-percent').textContent = Math.round(state.scale * 100) + ' %';
  }
  function zoom(next, cx, cy) {
    const prior = state.scale;
    state.scale = Math.max(.3, Math.min(1.8, next));
    const view = $('#board-viewport');
    cx ??= view.clientWidth / 2;
    cy ??= view.clientHeight / 2;
    state.tx = cx - (cx - state.tx) * state.scale / prior;
    state.ty = cy - (cy - state.ty) * state.scale / prior;
    transform();
  }
  function fit() {
    const view = $('#board-viewport');
    if (view.clientWidth < 700) {
      const first = state.entries[0];
      state.scale = .78;
      state.tx = view.clientWidth / 2 - (first.x + 123) * state.scale;
      state.ty = 65 - first.y * state.scale;
      transform();
      return;
    }
    const width = view.clientWidth - (!$('#board-panel').hidden ? $('#board-panel').offsetWidth : 0);
    const x0 = Math.min(...state.entries.map((entry) => entry.x));
    const y0 = Math.min(...state.entries.map((entry) => entry.y));
    const x1 = Math.max(...state.entries.map((entry) => entry.x + 246));
    const y1 = Math.max(...state.entries.map((entry) => entry.y + (entry.kind === 'document' ? 430 : 290)));
    state.scale = Math.max(.3, Math.min(1, (width - 80) / (x1 - x0), (view.clientHeight - 120) / (y1 - y0)));
    state.tx = (width - (x1 - x0) * state.scale) / 2 - x0 * state.scale;
    state.ty = 60 - y0 * state.scale;
    transform();
  }
  function focusInitialEvidencePath() {
    const view = $('#board-viewport');
    if (view.clientWidth < 700) { fit(); return; }
    // Keep the document, its marked evidence card and their connection readable.
    // "Einpassen" still shows every card after the visitor has explored this path.
    const focusEntries = state.entries.filter((entry) => entry.id !== 'n1');
    const x0 = Math.min(...focusEntries.map((entry) => entry.x));
    const x1 = Math.max(...focusEntries.map((entry) => entry.x + 246));
    const y0 = Math.min(...focusEntries.map((entry) => entry.y));
    const y1 = Math.max(...focusEntries.map((entry) => entry.y + (entry.kind === 'document' ? 430 : 290)));
    state.scale = Math.max(.65, Math.min(.9, (view.clientWidth - 90) / (x1 - x0), (view.clientHeight - 45) / (y1 - y0)));
    state.tx = (view.clientWidth - (x1 - x0) * state.scale) / 2 - x0 * state.scale;
    state.ty = 18 - y0 * state.scale;
    transform();
  }
  function focusEntry(entry) {
    const view = $('#board-viewport');
    state.tx = view.clientWidth / 2 - (entry.x + 123) * state.scale;
    state.ty = view.clientHeight / 2 - (entry.y + 100) * state.scale;
    state.selected = entry.id;
    transform();
    renderSelection();
  }
  function openReader(entry) {
    state.readerEntry = entry.id;
    state.marking = false;
    state.markerSelection = null;
    state.readerZoom = 1;
    $('#reader-mark').setAttribute('aria-pressed', 'false');
    $('#reader-sheet').classList.remove('marking');
    $('#reader-editor').hidden = true;
    $('#reader-title').textContent = entry.title;
    $('#reader-image').src = documentImage(entry);
    $('#reader-image').alt = entry.title + ', Beispielseite 1';
    $('#reader-status').textContent = 'Mit „Textstelle markieren“ beginnen und dann auf der Dokumentseite ziehen.';
    $('#document-reader').showModal();
    applyReaderZoom();
    renderReaderMarks();
  }
  function applyReaderZoom() {
    const stage = $('.eb-reader-scroll');
    $('#reader-sheet').style.width = state.readerZoom === 1 ? 'min(100%, 1000px)' : Math.round(Math.min(1000, stage.clientWidth - 36) * state.readerZoom) + 'px';
  }
  function positionMarker(marker, rect) {
    marker.style.left = rect.x * 100 + '%';
    marker.style.top = rect.y * 100 + '%';
    marker.style.width = rect.width * 100 + '%';
    marker.style.height = rect.height * 100 + '%';
  }
  function renderReaderMarks() {
    const layer = $('#reader-marks');
    layer.replaceChildren();
    const source = state.entries.find((item) => item.id === state.readerEntry);
    const asset = source?.reference?.asset || source?.catalogId;
    for (const entry of state.entries.filter((item) => item.kind === 'evidence' && item.reference?.asset === asset)) {
      const mark = B('', () => { $('#reader-status').textContent = entry.title + ' · ' + entry.author + (entry.body ? ' — ' + entry.body : ''); }, 'eb-text-marker');
      mark.setAttribute('aria-label', entry.title + ' — ' + entry.author);
      mark.style.setProperty('--marker', markerColors[entry.color] || markerColors.yellow);
      positionMarker(mark, entry.reference.rect);
      layer.append(mark);
    }
    if (state.markerSelection) {
      const draft = E('div', undefined, 'eb-text-marker eb-marker-draft');
      draft.style.setProperty('--marker', markerColors[state.markerColor]);
      positionMarker(draft, state.markerSelection);
      layer.append(draft);
    }
  }
  $('#reader-close').addEventListener('click', () => $('#document-reader').close());
  $('#reader-zoom-out').addEventListener('click', () => { state.readerZoom = Math.max(.5, state.readerZoom - .25); applyReaderZoom(); });
  $('#reader-zoom-in').addEventListener('click', () => { state.readerZoom = Math.min(3, state.readerZoom + .25); applyReaderZoom(); });
  $('#reader-zoom-fit').addEventListener('click', () => { state.readerZoom = 1; applyReaderZoom(); });
  $('#reader-mark').addEventListener('click', () => {
    state.marking = !state.marking;
    $('#reader-mark').setAttribute('aria-pressed', String(state.marking));
    $('#reader-sheet').classList.toggle('marking', state.marking);
    $('#reader-status').textContent = state.marking ? 'Ziehen Sie den Marker über die gewünschte Textstelle. Die Unterlage selbst bleibt unverändert.' : '';
  });
  document.querySelectorAll('[data-marker]').forEach((button) => button.addEventListener('click', () => {
    state.markerColor = button.dataset.marker;
    document.querySelectorAll('[data-marker]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    renderReaderMarks();
  }));
  $('#reader-sheet').addEventListener('pointerdown', (event) => {
    if (!state.marking || event.button !== 0 || !$('#reader-image').complete || !$('#reader-image').naturalWidth) return;
    event.preventDefault();
    const sheet = $('#reader-sheet');
    const bounds = $('#reader-image').getBoundingClientRect();
    const point = (next) => ({ x: Math.max(0, Math.min(1, (next.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (next.clientY - bounds.top) / bounds.height)) });
    const start = point(event);
    state.markerSelection = null;
    sheet.setPointerCapture(event.pointerId);
    const move = (next) => {
      const end = point(next);
      state.markerSelection = { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
      renderReaderMarks();
    };
    const finish = (accepted) => {
      sheet.removeEventListener('pointermove', move);
      sheet.removeEventListener('pointerup', up);
      sheet.removeEventListener('pointercancel', cancel);
      if (!accepted || !state.markerSelection || state.markerSelection.width < .002 || state.markerSelection.height < .002) {
        state.markerSelection = null;
        renderReaderMarks();
        return;
      }
      const source = state.entries.find((item) => item.id === state.readerEntry);
      $('#reader-evidence-title').value = (source.title + ' · Seite 1').slice(0, 140);
      $('#reader-evidence-note').value = '';
      $('#reader-editor').hidden = false;
      state.marking = false;
      sheet.classList.remove('marking');
      $('#reader-mark').setAttribute('aria-pressed', 'false');
      $('#reader-evidence-note').focus();
    };
    const up = () => finish(true);
    const cancel = () => finish(false);
    sheet.addEventListener('pointermove', move);
    sheet.addEventListener('pointerup', up);
    sheet.addEventListener('pointercancel', cancel);
  });
  $('#reader-discard').addEventListener('click', () => { state.markerSelection = null; $('#reader-editor').hidden = true; renderReaderMarks(); });
  $('#reader-editor').addEventListener('submit', (event) => {
    event.preventDefault();
    const source = state.entries.find((item) => item.id === state.readerEntry);
    const title = $('#reader-evidence-title').value.trim();
    if (!source || !state.markerSelection || !title) return;
    const reference = { asset: source.reference?.asset || source.catalogId, page: 1, rect: { ...state.markerSelection } };
    const position = positionNear(source);
    let newEvidence;
    mutate('Belegstelle angeheftet', () => {
      newEvidence = { id: 'e' + state.nextId++, kind: 'evidence', title, body: $('#reader-evidence-note').value.trim(), phase: source.phase, author: 'Teilnahme 01', status: 'open', color: state.markerColor, reference, ...position };
      state.entries.push(newEvidence);
    });
    state.markerSelection = null;
    $('#reader-editor').hidden = true;
    renderReaderMarks();
    $('#reader-status').textContent = 'Belegstelle gespeichert und auf dem gemeinsamen Board angeheftet.';
    $('#document-reader').close();
    requestAnimationFrame(() => focusEntry(newEvidence));
  });
  $('#tool-document').addEventListener('click', openCatalog);
  $('#tool-note').addEventListener('click', () => openForm('note'));
  $('#tool-hypothesis').addEventListener('click', () => openForm('hypothesis'));
  $('#tool-connect').addEventListener('click', () => {
    state.connecting = !state.connecting;
    state.linkFrom = null;
    $('#tool-connect').classList.toggle('active', state.connecting);
    status(state.connecting ? 'Zwei Karten nacheinander auswählen.' : 'Verknüpfen beendet.');
  });
  $('#tool-history').addEventListener('click', openHistory);
  $('#tool-results').addEventListener('click', openResults);
  $('#board-search').addEventListener('input', render);
  $('#board-filter').addEventListener('change', render);
  $('#board-search').addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); openResults(); } });
  $('#zoom-out').addEventListener('click', () => zoom(state.scale - .1));
  $('#zoom-in').addEventListener('click', () => zoom(state.scale + .1));
  $('#zoom-fit').addEventListener('click', fit);
  const viewport = $('#board-viewport');
  viewport.addEventListener('wheel', (event) => { event.preventDefault(); const rect = viewport.getBoundingClientRect(); zoom(state.scale * (event.deltaY > 0 ? .9 : 1.1), event.clientX - rect.left, event.clientY - rect.top); }, { passive: false });
  viewport.addEventListener('pointerdown', (event) => {
    if (event.target.closest('.eb-node,.eb-link-label')) return;
    const bounds = viewport.getBoundingClientRect();
    state.lastClick = { x: Math.max(0, Math.round((event.clientX - bounds.left - state.tx) / state.scale)), y: Math.max(0, Math.round((event.clientY - bounds.top - state.ty) / state.scale)) };
    const initial = { x: event.clientX, y: event.clientY, tx: state.tx, ty: state.ty };
    viewport.setPointerCapture(event.pointerId);
    const move = (next) => { state.tx = initial.tx + next.clientX - initial.x; state.ty = initial.ty + next.clientY - initial.y; transform(); };
    const end = () => { viewport.removeEventListener('pointermove', move); viewport.removeEventListener('pointerup', end); viewport.removeEventListener('pointercancel', end); };
    viewport.addEventListener('pointermove', move);
    viewport.addEventListener('pointerup', end);
    viewport.addEventListener('pointercancel', end);
  });
  viewport.addEventListener('dblclick', (event) => { if (!event.target.closest('.eb-node,.eb-link-label')) openForm('note'); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !$('#document-reader').open) hidePanel(); });
  render();
  transform();
  requestAnimationFrame(focusInitialEvidencePath);
})();
