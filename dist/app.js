(() => {
  'use strict';

  // This entire lab is intentionally local. Nothing is sent to a game server.
  const documents = [
    { id: 'ARC-01', title: 'Technisches Abrufprotokoll', kind: 'Protokoll', phase: 'Technik', snippet: 'Zeitstempel und Abrufwege eines beispielhaften Archivvorgangs.' },
    { id: 'ARC-02', title: 'Vertragsfassung', kind: 'Vertrag', phase: 'Bestand', snippet: 'Zwei Datumsangaben und eine dokumentierte Änderung im Vertragsbestand.' },
    { id: 'ARC-03', title: 'Auswertungsvermerk', kind: 'Vermerk', phase: 'Analyse', snippet: 'Offene Fragen zum Vergleich von Quelle und späterer Auswertung.' },
    { id: 'ARC-04', title: 'Transportprotokoll', kind: 'Protokoll', phase: 'Zustellung', snippet: 'Technische Transportdaten ohne automatische Aussage über den Inhalt.' },
    { id: 'ARC-05', title: 'Nachtrag zum Vertrag', kind: 'Vertrag', phase: 'Bestand', snippet: 'Ergänzung zur zeitlichen Einordnung der Vertragsfassung.' },
    { id: 'ARC-06', title: 'Prüfvermerk', kind: 'Vermerk', phase: 'Analyse', snippet: 'Beispiel für eine noch nicht abgeschlossene Quellenprüfung.' }
  ];
  const statuses = ['Offen', 'In Prüfung', 'Abgeglichen', 'Widerspruch offen'];
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const normalize = (value) => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const state = { view: 'search', entries: [], links: [], released: false, archived: false, past: [], events: ['Demo gestartet. Suche und Filter sind bereit.'], nextNote: 1 };

  function addEvent(message) {
    state.events.unshift(message);
    state.events.length = Math.min(state.events.length, 8);
    renderMonitor();
  }

  function saveBoardStep() {
    state.past.push(JSON.stringify({ entries: state.entries, links: state.links, nextNote: state.nextNote }));
    state.past.length = Math.min(state.past.length, 20);
  }

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function setView(view) {
    if (!['search', 'board', 'gate', 'finish'].includes(view)) return;
    state.view = view;
    $$('.step').forEach((tab) => {
      const selected = tab.dataset.view === view;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
      $('#panel-' + tab.dataset.view).hidden = !selected;
    });
    if (view === 'board') renderBoard();
    if (view === 'gate') renderGate();
    if (view === 'finish') renderFinish();
  }

  function renderResults() {
    const query = normalize($('#doc-query').value.trim());
    const kind = $('#doc-kind').value;
    const matches = documents.filter((doc) =>
      (kind === 'all' || doc.kind === kind) &&
      normalize([doc.id, doc.title, doc.kind, doc.phase, doc.snippet].join(' ')).includes(query)
    );
    $('#result-count').textContent = matches.length + ' von ' + documents.length + ' Beispieldokumenten';
    const list = $('#result-list');
    list.replaceChildren();
    if (!matches.length) {
      list.append(element('p', 'empty', 'Keine Treffer. Suchbegriff oder Dokumenttyp ändern.'));
      return;
    }
    for (const doc of matches) {
      const card = element('article', 'result-card');
      const info = element('div');
      info.append(element('small', '', doc.id + ' / ' + doc.kind.toUpperCase() + ' / ' + doc.phase.toUpperCase()));
      info.append(element('h4', '', doc.title));
      info.append(element('p', '', doc.snippet));
      const button = element('button', '', state.entries.some((entry) => entry.id === doc.id) ? 'Im Board' : 'Ins Board übernehmen');
      button.type = 'button';
      button.disabled = state.entries.some((entry) => entry.id === doc.id);
      button.setAttribute('aria-label', doc.title + ' ins Board übernehmen');
      button.addEventListener('click', () => {
        if (state.entries.some((entry) => entry.id === doc.id)) return;
        saveBoardStep();
        state.entries.push({ id: doc.id, kind: 'document', title: doc.title, snippet: doc.snippet, status: 'Offen' });
        addEvent(doc.id + ' ins Ermittlungsboard übernommen.');
        renderAll();
      });
      card.append(info, button);
      list.append(card);
    }
  }

  function renderBoard() {
    const query = normalize($('#board-query').value.trim());
    const status = $('#board-status').value;
    const entries = state.entries.filter((entry) =>
      (status === 'all' || entry.status === status) &&
      normalize([entry.id, entry.title, entry.snippet].join(' ')).includes(query)
    );
    const list = $('#board-list');
    list.replaceChildren();
    if (!state.entries.length) {
      list.append(element('p', 'empty', 'Noch kein Eintrag. Über „Archivsuche“ können Unterlagen ins Board übernommen werden.'));
    } else if (!entries.length) {
      list.append(element('p', 'empty', 'Kein Eintrag passt zum aktuellen Board-Filter.'));
    }
    for (const entry of entries) {
      const card = element('article', 'entry');
      card.append(element('small', '', entry.id + ' / ' + (entry.kind === 'document' ? 'UNTERLAGE' : 'NOTIZ')));
      card.append(element('h4', '', entry.title));
      if (entry.snippet) card.append(element('p', '', entry.snippet));
      const label = element('label');
      label.append(document.createTextNode('Arbeitsstatus'));
      const select = element('select');
      select.setAttribute('aria-label', 'Arbeitsstatus für ' + entry.title);
      for (const optionText of statuses) {
        const option = element('option', '', optionText);
        option.value = optionText;
        select.append(option);
      }
      select.value = entry.status;
      select.addEventListener('change', () => {
        if (entry.status === select.value) return;
        saveBoardStep();
        entry.status = select.value;
        addEvent(entry.id + ': Status → ' + entry.status + '.');
        renderAll();
      });
      label.append(select);
      card.append(label);
      list.append(card);
    }
    for (const select of [$('#link-from'), $('#link-to')]) {
      const prior = select.value;
      select.replaceChildren();
      const placeholder = element('option', '', 'Eintrag wählen');
      placeholder.value = '';
      select.append(placeholder);
      for (const entry of state.entries) {
        const option = element('option', '', entry.id + ' · ' + entry.title);
        option.value = entry.id;
        select.append(option);
      }
      if (state.entries.some((entry) => entry.id === prior)) select.value = prior;
    }
    $('#connect-button').disabled = state.entries.length < 2;
    $('#undo-button').disabled = !state.past.length;
    const links = $('#link-list');
    links.replaceChildren();
    if (!state.links.length) links.append(element('li', '', 'Noch keine Verbindungen.'));
    for (const link of state.links) {
      const from = state.entries.find((entry) => entry.id === link.from);
      const to = state.entries.find((entry) => entry.id === link.to);
      if (from && to) links.append(element('li', '', from.title + ' ↔ ' + to.title));
    }
  }

  function readyForGate() {
    return state.entries.filter((entry) => entry.kind === 'document').length >= 2 &&
      state.links.some((link) =>
        [link.from, link.to].every((id) => state.entries.some((entry) => entry.id === id && entry.kind === 'document'))
      );
  }

  function renderGate() {
    const documentCount = state.entries.filter((entry) => entry.kind === 'document').length;
    const evidence = readyForGate();
    $('#gate-evidence').textContent = documentCount + '/2 Unterlagen und ' + state.links.length + ' Verbindung(en). ' +
      (evidence ? 'Demobedingung erfüllt.' : 'Es fehlt mindestens eine Unterlage oder eine Verbindung zwischen zwei Unterlagen.');
    $('#gate-release').textContent = state.released ? 'Archivknoten freigegeben.' : evidence ? 'Freigabe ist jetzt möglich.' : 'Noch gesperrt: Prüfgrundlage fehlt.';
    $('#release-button').disabled = !evidence || state.released;
    $('#release-button').textContent = state.released ? 'Freigabe erfolgt' : 'Freigabe simulieren';
    $('#gate-handoff').textContent = state.archived ? 'Übergabe abgeschlossen.' : state.released ? 'Archivzugang kann jetzt übergeben werden.' : 'Wartet auf die Freigabe des Archivknotens.';
    $('#handoff-button').disabled = !state.released || state.archived;
    $('#handoff-button').textContent = state.archived ? 'Übergabe erfolgt' : 'Übergabe simulieren';
  }

  function renderFinish() {
    const finished = state.archived;
    $('#finish-symbol').textContent = finished ? '◆' : '◇';
    $('#finish-title').textContent = finished ? 'Archiv erreicht' : 'Übergabe noch ausstehend';
    $('#finish-description').textContent = finished
      ? 'Die beispielhafte Freigabe und Übergabe sind abgeschlossen. Der Zustand bleibt nur in diesem Browserfenster erhalten.'
      : 'Die Auswertung öffnet sich in dieser Demo erst, nachdem der Archivknoten freigegeben und der Vorgang übergeben wurde.';
  }

  function renderMonitor() {
    $('#monitor-entries').textContent = String(state.entries.length);
    $('#monitor-links').textContent = String(state.links.length);
    $('#monitor-ready').textContent = readyForGate() ? 'bereit' : 'offen';
    $('#monitor-release').textContent = state.released ? 'frei' : 'gesperrt';
    $('#monitor-handoff').textContent = state.archived ? 'erfolgt' : 'ausstehend';
    const list = $('#event-log');
    list.replaceChildren(...state.events.map((message) => element('li', '', message)));
  }

  function renderAll() {
    renderResults();
    renderBoard();
    renderGate();
    renderFinish();
    renderMonitor();
  }

  $$('.step').forEach((tab) => tab.addEventListener('click', () => setView(tab.dataset.view)));
  $('#doc-query').addEventListener('input', renderResults);
  $('#doc-kind').addEventListener('change', renderResults);
  $('#board-query').addEventListener('input', renderBoard);
  $('#board-status').addEventListener('change', renderBoard);
  $('#add-note').addEventListener('click', () => {
    const title = $('#note-title').value.trim();
    if (!title) {
      $('#note-title').focus();
      return;
    }
    saveBoardStep();
    const id = 'NOT-' + String(state.nextNote++).padStart(2, '0');
    state.entries.push({ id, kind: 'note', title, snippet: 'Eigene Notiz im isolierten Demoboard.', status: 'Offen' });
    $('#note-title').value = '';
    addEvent(id + ' als eigene Notiz angelegt.');
    renderAll();
  });
  $('#note-title').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') $('#add-note').click();
  });
  $('#connect-button').addEventListener('click', () => {
    const from = $('#link-from').value;
    const to = $('#link-to').value;
    if (!from || !to || from === to) {
      addEvent('Für eine Verbindung zwei verschiedene Einträge wählen.');
      return;
    }
    const exists = state.links.some((link) => [link.from, link.to].sort().join('|') === [from, to].sort().join('|'));
    if (exists) {
      addEvent('Diese Verbindung besteht bereits.');
      return;
    }
    saveBoardStep();
    state.links.push({ from, to });
    addEvent(from + ' und ' + to + ' verknüpft.');
    renderAll();
  });
  $('#undo-button').addEventListener('click', () => {
    if (!state.past.length) return;
    const old = JSON.parse(state.past.pop());
    state.entries = old.entries;
    state.links = old.links;
    state.nextNote = old.nextNote;
    addEvent('Letzte Board-Änderung rückgängig gemacht.');
    renderAll();
  });
  $('#release-button').addEventListener('click', () => {
    if (!readyForGate() || state.released) return;
    state.released = true;
    addEvent('Archivknoten freigegeben (nur Demo).');
    renderAll();
  });
  $('#handoff-button').addEventListener('click', () => {
    if (!state.released || state.archived) return;
    state.archived = true;
    addEvent('Archivübergabe abgeschlossen (nur Demo).');
    renderAll();
    setView('finish');
  });
  $('#demo-reset').addEventListener('click', () => {
    state.entries = [];
    state.links = [];
    state.released = false;
    state.archived = false;
    state.past = [];
    state.events = ['Demo neu gestartet.'];
    state.nextNote = 1;
    $('#doc-query').value = '';
    $('#doc-kind').value = 'all';
    $('#board-query').value = '';
    $('#board-status').value = 'all';
    $('#note-title').value = '';
    renderAll();
    setView('search');
  });

  const mapNodes = [
    { id: 'm1', day: '1', title: 'Technische Prüfung', detail: 'Eine Beobachtung wird nicht automatisch zur Schlussfolgerung. Erst Quelle und Gegenprüfung liefern einen belastbaren Befund.' },
    { id: 'm2', day: '2', title: 'Perspektiven abgleichen', detail: 'Unterschiedliche Gruppen sehen verschiedene Ausschnitte. Der Vergleich macht Lücken und Widersprüche sichtbar.' },
    { id: 'm3', day: '3', title: 'Belege verknüpfen', detail: 'Archivsuche, Notiz und Verbindung halten fest, auf welche Unterlage sich eine Aussage stützt.' },
    { id: 'm4', day: '3', title: 'Freigabe begründen', detail: 'Ein Übergang erfolgt erst, wenn der vorherige Stand ausreichend geprüft ist.' }
  ];
  let selectedMapNode = null;
  function renderMap() {
    const filter = $('#map-filter').value;
    const visible = mapNodes.filter((node) => filter === 'all' || node.day === filter);
    if (!visible.some((node) => node.id === selectedMapNode)) selectedMapNode = visible[0]?.id ?? null;
    const list = $('#map-nodes');
    list.replaceChildren();
    for (const node of visible) {
      const button = element('button');
      button.type = 'button';
      button.classList.toggle('selected', node.id === selectedMapNode);
      button.setAttribute('aria-pressed', String(node.id === selectedMapNode));
      button.append(element('span', '', node.title), element('small', '', 'TAG ' + node.day));
      button.addEventListener('click', () => { selectedMapNode = node.id; renderMap(); });
      list.append(button);
    }
    const detail = $('#map-detail');
    detail.replaceChildren();
    const selected = mapNodes.find((node) => node.id === selectedMapNode);
    if (selected) detail.append(element('strong', '', selected.title), element('p', '', selected.detail));
  }

  const scenes = [
    { marker: 'SZENE 01 / 03', title: 'Datenpunkt', text: 'Ein technischer Eintrag wirkt eindeutig. Ohne Kontext sagt er aber weniger aus, als zunächst scheint.' },
    { marker: 'SZENE 02 / 03', title: 'Gegenprüfung', text: 'Ein zweiter Blick verbindet Herkunft, Zeitpunkt und Perspektive. Daraus entsteht eine begründete Frage.' },
    { marker: 'SZENE 03 / 03', title: 'Einordnung', text: 'Die Auswertung führt Beobachtungen und Lernziel zusammen, statt nur eine Lösung zu präsentieren.' }
  ];
  let storyIndex = 0;
  function renderStory() {
    const scene = scenes[storyIndex];
    $('#story-card').replaceChildren(element('small', '', scene.marker), element('strong', '', scene.title), element('p', '', scene.text));
    $('#story-position').textContent = (storyIndex + 1) + ' / ' + scenes.length;
    $('#story-progress').style.width = ((storyIndex + 1) / scenes.length * 100) + '%';
    $('#story-prev').disabled = storyIndex === 0;
    $('#story-next').disabled = storyIndex === scenes.length - 1;
  }
  $('#story-prev').addEventListener('click', () => { storyIndex = Math.max(0, storyIndex - 1); renderStory(); });
  $('#story-next').addEventListener('click', () => { storyIndex = Math.min(scenes.length - 1, storyIndex + 1); renderStory(); });
  $('#map-filter').addEventListener('change', renderMap);
  $$('[data-debrief-view]').forEach((button) => button.addEventListener('click', () => {
    const view = button.dataset.debriefView;
    $$('[data-debrief-view]').forEach((item) => {
      const active = item.dataset.debriefView === view;
      item.classList.toggle('selected', active);
      item.setAttribute('aria-pressed', String(active));
    });
    $$('.debrief-panel').forEach((panel) => { panel.hidden = panel.id !== 'debrief-' + view; });
  }));
  let caveTimeout;
  $('#cave-replay').addEventListener('click', () => {
    const stage = $('#cave-stage');
    const button = $('#cave-replay');
    clearTimeout(caveTimeout);
    stage.classList.remove('replaying');
    void stage.offsetWidth;
    stage.classList.add('replaying');
    button.disabled = true;
    button.textContent = 'Öffnung läuft …';
    caveTimeout = setTimeout(() => {
      stage.classList.remove('replaying');
      button.disabled = false;
      button.textContent = 'Erneut abspielen';
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 50 : 2250);
  });

  // Independent, spoiler-free models of three additional production rules.
  const reactors = new Set();
  function renderReactors() {
    const grid = $('#reactor-grid');
    grid.replaceChildren();
    for (let number = 1; number <= 5; number++) {
      const button = element('button', reactors.has(number) ? 'done' : '', String(number).padStart(2, '0'));
      button.type = 'button';
      button.setAttribute('aria-pressed', String(reactors.has(number)));
      button.setAttribute('aria-label', 'Reaktor ' + number + (reactors.has(number) ? ' abgeschlossen' : ' noch offen'));
      button.addEventListener('click', () => {
        if (reactors.has(number)) reactors.delete(number);
        else reactors.add(number);
        renderReactors();
      });
      grid.append(button);
    }
    $('#reactor-output').textContent = reactors.size === 5
      ? '5/5 Reaktoren abgeschlossen → Schlussaudit freigegeben.'
      : reactors.size + '/5 Reaktoren abgeschlossen → Schlussaudit noch gesperrt.';
  }
  $('#reactor-reset').addEventListener('click', () => { reactors.clear(); renderReactors(); });

  let selectedGroup = null;
  const groupNames = ['A', 'B', 'C', 'D', 'V'];
  function renderGroups() {
    const grid = $('#group-grid');
    grid.replaceChildren();
    for (const name of groupNames) {
      const button = element('button', selectedGroup === name ? 'selected' : '', name);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(selectedGroup === name));
      button.setAttribute('aria-label', 'Ermittlungsweg ' + name + ' wählen');
      button.addEventListener('click', () => { selectedGroup = name; renderGroups(); });
      grid.append(button);
    }
    let message = selectedGroup ? 'Ermittlungsweg ' + selectedGroup + ' gewählt. ' : 'Bitte einen Ermittlungsweg wählen. ';
    if (selectedGroup && $('#intervention').checked) message += 'Intervention aktiv → nächster Schritt blockiert (Original: HTTP 423).';
    else if (selectedGroup && !$('#time-gate').checked) message += 'Zeitfenster geschlossen → Archivfreigabe wartet (Original: HTTP 425).';
    else if (selectedGroup) message += 'Zeitfenster offen → gruppenspezifischer Archivstand freigegeben.';
    $('#group-output').textContent = message;
  }
  $('#time-gate').addEventListener('change', renderGroups);
  $('#intervention').addEventListener('change', renderGroups);

  let callStatus = 'bereit';
  let callRoute = 'app';
  function renderCall() {
    $('#call-start').disabled = callStatus === 'ringing';
    $('#call-accept').disabled = callStatus !== 'ringing';
    $('#call-decline').disabled = callStatus !== 'ringing';
    const route = callRoute === 'push' ? 'Push-Zustellung angefragt; Öffnen führt zur Anrufansicht. ' : 'Anruf erscheint direkt in der offenen App. ';
    const status = {
      bereit: 'Noch kein Anruf ausgelöst.',
      ringing: 'Status: klingelt. ' + route + 'Annehmen oder ablehnen ist jetzt möglich.',
      accepted: 'Status: angenommen. Der Server hält den erfolgreichen Zustandswechsel fest.',
      declined: 'Status: abgelehnt. Der Server hält den beendeten Zustandswechsel fest.'
    };
    $('#call-output').textContent = status[callStatus];
  }
  $('#call-start').addEventListener('click', () => { callRoute = $('#call-route').value; callStatus = 'ringing'; renderCall(); });
  $('#call-accept').addEventListener('click', () => { if (callStatus === 'ringing') { callStatus = 'accepted'; renderCall(); } });
  $('#call-decline').addEventListener('click', () => { if (callStatus === 'ringing') { callStatus = 'declined'; renderCall(); } });

  renderAll();
  renderMap();
  renderStory();
  renderReactors();
  renderGroups();
  renderCall();
  setView('search');
})();
