(() => {
  const $ = (id) => document.getElementById(id);
  let name = '';
  let chosen = '';
  let pending = '';
  const headers = {
    lobby: ['L&B EINSATZLOBBY', 'Anmeldung vor dem gemeinsamen Start', 'LOBBY'],
    intro: ['L&B PRESSEARCHIV // BESTAND 2014', 'Rekonstruiertes Pressearchiv', 'ARCHIV'],
    group: ['SEGMENTZUWEISUNG', 'Arbeitsbereiche zuordnen', 'A–V'],
    archive: ['ARCHIVSEGMENT', 'Fiktive Unterlagen und zugeordnete Aufzeichnungen', 'GRUPPE'],
  };
  const stages = {
    lobby: ['01 / 04 · LOBBY', 'Die Lobby registriert ein Gerät. Die Leitung kann den gemeinsamen Start auslösen.'],
    intro: ['02 / 04 · PRESSEARCHIV', 'Originalansicht und Transkript gehören zum selben Dokument. Die Rätselantwort ist in dieser Vorschau ausgelassen.'],
    group: ['03 / 04 · SEGMENTZUWEISUNG', 'Wählen Sie A, B, C, D oder V. Unterschiedliche Bereiche erhalten unterschiedliche Unterlagen. E folgt später.'],
    archive: ['04 / 04 · GRUPPENARCHIV', 'Navigation und Inhalt wechseln mit der Gruppe. Hier sehen Sie ausschließlich fiktive Dokumente.'],
  };

  function view(which) {
    ['lobby', 'intro', 'group', 'archive'].forEach((id) => $(id + 'View').classList.toggle('hidden', id !== which));
    const header = headers[which];
    $('mainTitle').textContent = which === 'archive' ? `ARCHIVSEGMENT ${chosen}` : header[0];
    $('mainSubtitle').textContent = header[1];
    $('statusBadge').textContent = which === 'archive' ? `GRUPPE ${chosen}` : header[2];
    $('step-label').textContent = stages[which][0];
    $('guide-text').textContent = stages[which][1];
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function groups() {
    const container = $('groupCards');
    container.replaceChildren();
    ['A', 'B', 'C', 'D', 'V'].forEach((group) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'group-card' + (chosen === group ? ' selected' : '');
      button.innerHTML = `<span>GRUPPE ${group}</span><strong>BEISPIELBEREICH</strong>`;
      button.addEventListener('click', () => {
        pending = group;
        $('confirmText').textContent = `Gruppe ${group} auswählen?`;
        $('groupConfirm').classList.remove('hidden');
      });
      container.append(button);
    });
  }

  function doc(key) {
    const titles = { report: 'Beispielprotokoll', timeline: 'Zeitlinie', notice: 'Hinweis' };
    const descriptions = {
      report: `Dieser neutrale Auszug demonstriert die Lesefläche für Gruppe ${chosen}. Im Original sind hier gruppenspezifische Quellen eingebunden.`,
      timeline: 'Eine zeitliche Ordnung kann andere Unterlagen ergänzen. Auch dieser Text ist erfunden und enthält keine Hinweise auf den Spielverlauf.',
      notice: 'Die konkrete Freigabe hängt im Originalsystem von Phase, Gruppenstand und Zeitfenster ab.',
    };
    $('archiveText').innerHTML = `<div class="archive-prose"><small>ÖFFENTLICHE DEMO // GRUPPE ${chosen}</small><h3>${titles[key]}</h3><p>${descriptions[key]}</p><aside>Die echte Oberfläche behält Navigation und Lesebereich bei. Diese Beispielinhalte ersetzen alle Originalunterlagen.</aside></div>`;
    document.querySelectorAll('#archiveNav button').forEach((button) => button.classList.toggle('active', button.dataset.doc === key));
  }

  $('lobbyForm').addEventListener('submit', (event) => {
    event.preventDefault();
    name = $('lobbyUsername').value.trim();
    if (name.length < 2) return;
    $('lobbyForm').classList.add('hidden');
    $('lobbyWaiting').classList.remove('hidden');
    $('joinedUsername').textContent = name;
    $('lobbyTitle').textContent = 'Angemeldet · Start abwarten';
    $('lobbyHint').textContent = 'Dieses Gerät ist in der Demo-Lobby registriert. Das Pressearchiv bleibt bis zum gemeinsamen Start gesperrt.';
  });
  $('startDemo').addEventListener('click', () => view('intro'));
  $('toGroups').addEventListener('click', () => { groups(); view('group'); });
  $('showImages').addEventListener('click', () => {
    $('articleImages').classList.remove('hidden');
    $('articleTranscript').classList.add('hidden');
    $('showImages').classList.add('active');
    $('showTranscript').classList.remove('active');
    $('showImages').setAttribute('aria-selected', 'true');
    $('showTranscript').setAttribute('aria-selected', 'false');
  });
  $('showTranscript').addEventListener('click', () => {
    $('articleImages').classList.add('hidden');
    $('articleTranscript').classList.remove('hidden');
    $('showImages').classList.remove('active');
    $('showTranscript').classList.add('active');
    $('showImages').setAttribute('aria-selected', 'false');
    $('showTranscript').setAttribute('aria-selected', 'true');
  });
  $('confirmGroup').addEventListener('click', () => {
    chosen = pending;
    $('groupConfirm').classList.add('hidden');
    $('archiveTitle').textContent = `ARCHIVSEGMENT ${chosen}`;
    $('groupBadge').textContent = `GRUPPE ${chosen}`;
    doc('report');
    view('archive');
  });
  $('cancelGroup').addEventListener('click', () => $('groupConfirm').classList.add('hidden'));
  $('backGroups').addEventListener('click', () => { groups(); view('group'); });
  document.querySelectorAll('#archiveNav button').forEach((button) => button.addEventListener('click', () => doc(button.dataset.doc)));
  $('reset').addEventListener('click', () => {
    chosen = '';
    pending = '';
    name = '';
    $('lobbyUsername').value = '';
    $('lobbyForm').classList.remove('hidden');
    $('lobbyWaiting').classList.add('hidden');
    $('lobbyTitle').textContent = 'Username eintragen';
    $('lobbyHint').textContent = 'Melden Sie dieses Gerät mit einem eindeutigen Namen an. Das Pressearchiv bleibt bis zum gemeinsamen Start gesperrt.';
    view('lobby');
  });
  view('lobby');
})();
