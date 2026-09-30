import { createReactorScene } from './reactor-scene.bundle.js';
import { initialTourStep, canVisit, nextTourStep, tourSnapshot } from './tag1-state.js';

const $ = (id) => document.getElementById(id);
const colors = ['#ff865e', '#5ba7ff', '#62d793', '#ffc45d', '#5ed6e5', '#dffaff'];
const topics = ['Internet of Things', 'Big Data', 'Künstliche Intelligenz', 'Blockchain', 'Cloud Computing'];
let step = initialTourStep();
let controller = null;
let ready = false;
let failed = false;
let startup = Array(5).fill(false);
let auditReady = false;
let positions = [];
let flying = false;
let mode = 'map';

function setMessage(message) {
  $('demo-message').textContent = message;
}

function renderLoading() {
  const loading = $('reactor-loading');
  if (failed || flying || mode !== 'map') {
    loading.hidden = true;
    return;
  }
  loading.hidden = ready && (step === 6 ? auditReady : startup[step - 1]);
  loading.textContent = !ready
    ? '3D-Anlage wird geladen …'
    : step === 6
      ? 'Auditkern wird für den visuellen Rundgang vorbereitet …'
      : `Reaktor ${String(step).padStart(2, '0')} wird für den Rundgang vorbereitet …`;
}

function renderAccess() {
  const access = $('reactor-access');
  access.replaceChildren();
  if (!ready || failed || flying || mode !== 'map') return;
  for (let index = 0; index < 5; index += 1) {
    const position = positions[index];
    if (!position) continue;
    const id = index + 1;
    if (id < step) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.style.left = `${position.x}%`;
    button.style.top = `${position.y}%`;
    button.style.setProperty('--access-color', colors[index]);
    const available = canVisit(step, id) && startup[index];
    button.disabled = !available;
    const caption = id > step ? 'NOCH NICHT IM RUNDGANG' : !startup[index] ? 'STARTET' : 'ANSEHEN';
    button.innerHTML = `<strong>REAKTOR ${String(id).padStart(2, '0')}</strong><small>${caption}</small>`;
    button.setAttribute('aria-label', `Reaktor ${String(id).padStart(2, '0')}, ${topics[index]}: ${caption.toLowerCase()}`);
    button.addEventListener('click', () => enterReactor(id));
    access.append(button);
  }
  if (step === 6 && auditReady && positions[5]) {
    const position = positions[5];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'audit-access';
    button.style.left = `${position.x}%`;
    button.style.top = `${position.y}%`;
    button.style.setProperty('--access-color', colors[5]);
    button.innerHTML = '<strong>REAKTOR 06</strong><small>AUDITKERN ANSEHEN</small>';
    button.setAttribute('aria-label', 'Reaktor 06: Auditkern im visuellen Rundgang ansehen');
    button.addEventListener('click', () => enterReactor(6));
    access.append(button);
  }
}

function renderStatusList() {
  const list = $('reactor-status-list');
  list.replaceChildren();
  for (let id = 1; id <= 5; id += 1) {
    const row = document.createElement('li');
    row.className = id < step ? 'qualified' : id === step ? 'open' : 'locked';
    row.innerHTML = `<strong>${String(id).padStart(2, '0')} · REAKTOR</strong><em>${topics[id - 1]}</em><span>${id < step ? 'Im Rundgang gezeigt' : id === step ? 'Aktuelle Ansicht' : 'Folgt im Rundgang'}</span>`;
    list.append(row);
  }
  $('map-progress').textContent = `Visueller Rundgang · ${Math.min(step - 1, 5)} von 5 Reaktoransichten gezeigt${step === 6 ? ' · Auditkern sichtbar' : ''}`;
  $('map-panel').querySelector('h2').textContent = step === 6
    ? 'Der Auditkern erscheint im Rundgang.'
    : `Reaktor ${String(step).padStart(2, '0')} ${startup[step - 1] ? 'ist bereit' : 'wird vorbereitet'}.`;
  $('current-topic').textContent = step === 6 ? 'Abschlussknoten / Schlussaudit' : `Technologie ${String(step).padStart(2, '0')} / ${topics[step - 1]}`;
}

function render() {
  renderStatusList();
  $('map-panel').hidden = mode !== 'map';
  $('case-panel').hidden = mode !== 'case';
  $('audit-panel').hidden = mode !== 'audit';
  $('flight-status').hidden = mode !== 'flight';
  renderLoading();
  renderAccess();
}

function enterReactor(id) {
  if (!ready || failed || flying || !canVisit(step, id) || (id === 6 ? !auditReady : !startup[id - 1])) return;
  flying = true;
  mode = 'flight';
  $('flight-status').textContent = `REAKTOR ${String(id).padStart(2, '0')} · KAMERAFAHRT`;
  setMessage(`Originale Kamerafahrt zu Reaktor ${String(id).padStart(2, '0')} läuft.`);
  render();
  controller.fly(id - 1);
}

function returnToMap() {
  mode = 'map';
  controller?.overview();
  render();
  $('reactor-stage').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showView(id) {
  flying = false;
  mode = id === 6 ? 'audit' : 'case';
  $('flight-status').hidden = true;
  if (id < 6) {
    $('case-title').textContent = `Reaktor ${String(id).padStart(2, '0')}`;
    $('case-topic').textContent = topics[id - 1];
    $('tour-next').textContent = id === 5 ? 'Auditkern im Rundgang ansehen →' : `Reaktor ${String(id + 1).padStart(2, '0')} im Rundgang ansehen →`;
    setMessage(`Reaktor ${String(id).padStart(2, '0')} im originalen 3D-Modell gezeigt. Fachliche Originalfälle werden hier nicht gespielt.`);
  } else {
    setMessage('Auditkern im Kamerarundgang gezeigt. Das ist keine fachliche Freigabe.');
  }
  render();
  if (matchMedia('(max-width: 980px)').matches) $('reactor-side').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

$('tour-next').addEventListener('click', () => {
  if (mode !== 'case' || step >= 6) return;
  step = nextTourStep(step);
  controller.update(tourSnapshot(step));
  returnToMap();
  setMessage(step === 6
    ? 'Für den visuellen Rundgang wird jetzt der Auditkern gezeigt; es wurde keine Fallabgabe durchgeführt.'
    : `Reaktor ${String(step).padStart(2, '0')} wird im visuellen Rundgang vorbereitet. Es wurde keine Fallabgabe durchgeführt.`);
});
$('case-back').addEventListener('click', returnToMap);
$('audit-back').addEventListener('click', returnToMap);
$('demo-reset').addEventListener('click', () => {
  step = initialTourStep();
  mode = 'map';
  controller?.update(tourSnapshot(step));
  controller?.overview();
  render();
  setMessage('Rundgang zurückgesetzt. Reaktor 01 ist wieder die erste Ansicht.');
});

render();
try {
  controller = createReactorScene({
    stage: $('reactor-stage'),
    canvas: $('reactor-canvas'),
    snapshot: tourSnapshot(step),
    onReady(value) {
      ready = value;
      render();
      if (value) setMessage('Originale 3D-Anlage geladen. Reaktor 01 wird vorbereitet.');
    },
    onStartup(value) {
      startup = value;
      render();
      if (value[step - 1] && mode === 'map') setMessage(`Reaktor ${String(step).padStart(2, '0')} ist im 3D-Bild für den Rundgang bedienbar.`);
    },
    onAuditReady(value) { auditReady = value; renderAccess(); renderLoading(); },
    onLayout(value) { positions = value; renderAccess(); },
    onFlightPhase(value) {
      if (mode !== 'flight') return;
      const labels = { approach: 'ANFLUG AUF DEN REAKTOR', descent: 'EINTRITT IN DEN KERN', tunnel: 'VERBINDUNG ZUR TECHNOLOGIEKAMMER' };
      $('flight-status').textContent = labels[value] || 'REAKTORZUGANG WIRD GEÖFFNET';
    },
    onFlightEnd(id) {
      if (!canVisit(step, id)) { returnToMap(); return; }
      controller.detail(id - 1);
      showView(id);
    },
    onError() {
      failed = true;
      ready = false;
      $('reactor-fallback').hidden = false;
      render();
      setMessage('Die 3D-Anlage ist in diesem Browser nicht verfügbar. Die statische QA-Aufnahme wird nicht als Simulation ausgegeben.');
    },
  });
} catch {
  failed = true;
  $('reactor-fallback').hidden = false;
  render();
  setMessage('Die 3D-Anlage konnte nicht gestartet werden.');
}
