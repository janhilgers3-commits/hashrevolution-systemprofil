import { createReactorScene } from './reactor-scene.bundle.js';
import { initialDemoState, auditEligible, canOpenCase, reactorSnapshot, submitDemoCase, applyDemoReview, isQualified } from './tag1-state.js';

const $ = (id) => document.getElementById(id);
const colors = ['#ff865e', '#5ba7ff', '#62d793', '#ffc45d', '#5ed6e5', '#dffaff'];
const statusLabels = {
  open: 'Zur Bearbeitung',
  locked: 'Gesperrt',
  pending: 'Eingegangen',
  approved: 'Bestätigt',
  revision: 'Revision offen',
};

let state = initialDemoState();
let controller = null;
let ready = false;
let failed = false;
let startup = Array(5).fill(false);
let auditReady = false;
let positions = [];
let selectedCase = 0;
let flying = false;
let mode = 'map';

function setMessage(message) {
  $('demo-message').textContent = message;
}

function effectiveStatus(id) {
  return id > state.activeCase ? 'locked' : state.statuses[id - 1];
}

function renderLoading() {
  const loading = $('reactor-loading');
  if (failed || flying || mode !== 'map') {
    loading.hidden = true;
    return;
  }
  const waitingForAudit = auditEligible(state);
  const activeIndex = Math.min(state.activeCase - 1, 4);
  loading.hidden = ready && (waitingForAudit ? auditReady : startup[activeIndex]);
  loading.textContent = !ready
    ? '3D-Anlage wird geladen …'
    : waitingForAudit
      ? 'Auditkern wird vorbereitet …'
      : `Reaktor ${String(state.activeCase).padStart(2, '0')} wird vorbereitet …`;
}

function renderAccess() {
  const access = $('reactor-access');
  access.replaceChildren();
  if (!ready || failed || flying || mode !== 'map') return;
  for (let index = 0; index < 5; index += 1) {
    const position = positions[index];
    if (!position) continue;
    const id = index + 1;
    const status = effectiveStatus(id);
    if (isQualified(status)) continue; // The original scene seals received work.
    const button = document.createElement('button');
    button.type = 'button';
    button.style.left = `${position.x}%`;
    button.style.top = `${position.y}%`;
    button.style.setProperty('--access-color', colors[index]);
    const available = canOpenCase(state, id) && startup[index];
    button.disabled = !available;
    const caption = status === 'locked' ? 'GESPERRT' : !startup[index] ? 'STARTET' : status === 'revision' ? 'REVISION' : 'ÖFFNEN';
    button.innerHTML = `<strong>REAKTOR ${String(id).padStart(2, '0')}</strong><small>${caption}</small>`;
    button.setAttribute('aria-label', `Reaktor ${String(id).padStart(2, '0')}: ${caption.toLowerCase()}`);
    button.addEventListener('click', () => enterReactor(id));
    access.append(button);
  }
  if (auditEligible(state) && auditReady && positions[5]) {
    const position = positions[5];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'audit-access';
    button.style.left = `${position.x}%`;
    button.style.top = `${position.y}%`;
    button.style.setProperty('--access-color', colors[5]);
    button.innerHTML = '<strong>REAKTOR 06</strong><small>AUDIT ÖFFNEN</small>';
    button.setAttribute('aria-label', 'Reaktor 06: Schlussaudit öffnen');
    button.addEventListener('click', () => enterReactor(6));
    access.append(button);
  }
}

function renderReview() {
  const target = $('review-target');
  const old = target.value;
  target.replaceChildren();
  const pending = state.statuses.map((status, index) => status === 'pending' ? index + 1 : 0).filter(Boolean);
  if (!pending.length) {
    target.add(new Option('Noch keine eingegangene Abgabe', ''));
  } else {
    for (const id of pending) target.add(new Option(`Reaktor ${String(id).padStart(2, '0')}`, String(id)));
    if (pending.includes(Number(old))) target.value = old;
  }
  $('review-revision').disabled = !pending.length;
  $('review-approve').disabled = !pending.length;
}

function renderStatusList() {
  const list = $('reactor-status-list');
  list.replaceChildren();
  for (let id = 1; id <= 5; id += 1) {
    const status = effectiveStatus(id);
    const row = document.createElement('li');
    row.className = `${isQualified(status) ? 'qualified ' : ''}${status}`;
    row.innerHTML = `<strong>${String(id).padStart(2, '0')} · REAKTOR</strong><span>${statusLabels[status]}</span>`;
    list.append(row);
  }
  const count = state.statuses.filter(isQualified).length;
  $('map-progress').textContent = `${count} / 5 qualifizierte Musterabgaben · Audit ${auditEligible(state) ? 'freigegeben' : 'gesperrt'}`;
  $('map-panel').querySelector('h2').textContent = auditEligible(state)
    ? 'Der Auditkern öffnet sich.'
    : `Reaktor ${String(Math.min(state.activeCase, 5)).padStart(2, '0')} ist ${startup[Math.min(state.activeCase - 1, 4)] ? 'bereit' : 'im Aufbau'}.`;
}

function renderPanels() {
  $('map-panel').hidden = mode !== 'map';
  $('case-panel').hidden = mode !== 'case';
  $('audit-panel').hidden = mode !== 'audit';
  $('flight-status').hidden = mode !== 'flight';
  renderLoading();
}

function render() {
  renderStatusList();
  renderReview();
  renderPanels();
  renderAccess();
}

function enterReactor(id) {
  if (!ready || failed || flying || !canOpenCase(state, id) || (id === 6 ? !auditReady : !startup[id - 1])) return;
  flying = true;
  mode = 'flight';
  $('flight-status').textContent = `REAKTOR ${String(id).padStart(2, '0')} · ZUGANG WIRD GEÖFFNET`;
  setMessage(`Kamerafahrt zu Reaktor ${String(id).padStart(2, '0')} läuft.`);
  render();
  controller.fly(id - 1);
}

function returnToMap() {
  selectedCase = 0;
  mode = 'map';
  controller?.overview();
  render();
  $('reactor-stage').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showCase(id) {
  selectedCase = id;
  flying = false;
  mode = id === 6 ? 'audit' : 'case';
  $('flight-status').hidden = true;
  if (id < 6) {
    $('case-title').textContent = `Reaktor ${String(id).padStart(2, '0')}${state.statuses[id - 1] === 'revision' ? ' · Revision' : ''}`;
    $('case-decision').value = state.decisions[id - 1];
    $('case-note').value = state.notes[id - 1];
    $('case-error').hidden = true;
    setMessage(`Reaktor ${String(id).padStart(2, '0')} geöffnet. Musterentscheidung und Belegvermerk können eingegeben werden.`);
  } else {
    setMessage('Der Schlussaudit ist nach fünf qualifizierten Abgaben freigegeben.');
  }
  render();
  if (matchMedia('(max-width: 980px)').matches) $('reactor-side').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

$('case-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const id = selectedCase;
  try {
    const wasRevision = state.statuses[id - 1] === 'revision';
    state = submitDemoCase(state, id, $('case-decision').value, $('case-note').value);
    $('case-error').hidden = true;
    controller.update(reactorSnapshot(state));
    returnToMap();
    setMessage(wasRevision
      ? `Reaktor ${String(id).padStart(2, '0')}: Revision erneut eingegangen und versiegelt. Der bisherige Fortschritt bleibt erhalten.`
      : `Reaktor ${String(id).padStart(2, '0')}: Musterabgabe eingegangen und versiegelt. ${id < 5 ? `Reaktor ${String(id + 1).padStart(2, '0')} wird freigegeben.` : 'Der Auditkern prüft fünf qualifizierte Abgaben.'}`);
  } catch (error) {
    $('case-error').textContent = error.message;
    $('case-error').hidden = false;
  }
});

$('case-back').addEventListener('click', returnToMap);
$('audit-back').addEventListener('click', returnToMap);
$('demo-reset').addEventListener('click', () => {
  state = initialDemoState();
  selectedCase = 0;
  mode = 'map';
  controller?.update(reactorSnapshot(state));
  controller?.overview();
  render();
  setMessage('Demostand zurückgesetzt. Reaktor 01 ist wieder der einzige zugängliche Prüfstand.');
});

function review(action) {
  const id = Number($('review-target').value);
  try {
    state = applyDemoReview(state, id, action);
    controller?.update(reactorSnapshot(state));
    if (action === 'revision' && mode === 'audit') {
      selectedCase = 0;
      mode = 'map';
      controller?.overview();
    }
    render();
    setMessage(action === 'revision'
      ? `Externes Leitungsereignis: Reaktor ${String(id).padStart(2, '0')} ist zur Revision geöffnet. Der Auditkern ist wieder gesperrt.`
      : `Externes Leitungsereignis: Abgabe von Reaktor ${String(id).padStart(2, '0')} bestätigt.`);
  } catch (error) {
    setMessage(error.message);
  }
}
$('review-revision').addEventListener('click', () => review('revision'));
$('review-approve').addEventListener('click', () => review('approved'));

render();
try {
  controller = createReactorScene({
    stage: $('reactor-stage'),
    canvas: $('reactor-canvas'),
    snapshot: reactorSnapshot(state),
    onReady(value) {
      ready = value;
      render();
      if (value) setMessage('Originale 3D-Anlage geladen. Reaktor 01 wird vorbereitet.');
    },
    onStartup(value) {
      startup = value;
      render();
      if (value[0] && mode === 'map') setMessage('Reaktor 01 ist im 3D-Bild bedienbar. Reaktoren 02–05 bleiben zunächst gesperrt.');
    },
    onAuditReady(value) { auditReady = value; renderAccess(); },
    onLayout(value) { positions = value; renderAccess(); },
    onFlightPhase(value) {
      if (mode !== 'flight') return;
      const labels = { approach: 'ANFLUG AUF DEN REAKTOR', descent: 'EINTRITT IN DEN KERN', tunnel: 'VERBINDUNG ZUR TECHNOLOGIEKAMMER' };
      $('flight-status').textContent = labels[value] || 'REAKTORZUGANG WIRD GEÖFFNET';
    },
    onFlightEnd(id) {
      if (!canOpenCase(state, id)) { returnToMap(); return; }
      controller.detail(id - 1);
      showCase(id);
    },
    onError() {
      failed = true;
      ready = false;
      $('reactor-fallback').hidden = false;
      render();
      setMessage('Die 3D-Anlage ist in diesem Browser nicht verfügbar. Die statische QA-Aufnahme wird ausdrücklich nicht als funktionierende Simulation ausgegeben.');
    },
  });
} catch {
  failed = true;
  $('reactor-fallback').hidden = false;
  render();
  setMessage('Die 3D-Anlage konnte nicht gestartet werden.');
}
