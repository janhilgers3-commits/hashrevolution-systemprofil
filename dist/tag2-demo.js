(() => {
  const $ = (id) => document.getElementById(id);
  let name = '';
  let chosen = '';
  let pending = '';
  const headers = {
    lobby: ['L&B EINSATZLOBBY', 'Anmeldung vor dem gemeinsamen Start', 'LOBBY'],
    intro: ['L&B PRESSEARCHIV // BESTAND 2014', 'Rekonstruiertes Pressearchiv', 'ARCHIV'],
    group: ['SEGMENTZUWEISUNG', 'Arbeitsbereiche zuordnen', 'A–V'],
    archive: ['ARCHIVSEGMENT', 'Getrennte Lesefläche · Originalinhalt verdeckt', 'GRUPPE'],
  };
  const stages = {
    lobby: ['01 / 04 · LOBBY', 'Die Lobby registriert ein Gerät. Die Leitung kann den gemeinsamen Start auslösen.'],
    intro: ['02 / 04 · PRESSEARCHIV', 'Artikelansicht und Transkript gehören im Original zum selben Dokument. Der geschützte Inhalt ist hier verdeckt.'],
    group: ['03 / 04 · SEGMENTZUWEISUNG', 'A, B, C, D oder V zeigen getrennte Ansichtsbereiche. E folgt später. Diese Vorschau nimmt keine Gruppenzuordnung vor.'],
    archive: ['04 / 04 · GRUPPENARCHIV', 'Die Navigation zeigt Dokument-, Audio- und Freigabebereiche; gruppenspezifische Inhalte bleiben verdeckt.'],
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
      button.innerHTML = `<span>GRUPPE ${group}</span><strong>ANSICHT ANSEHEN</strong>`;
      button.addEventListener('click', () => {
        pending = group;
        $('confirmText').textContent = `Ansichtsbereich ${group} öffnen?`;
        $('groupConfirm').classList.remove('hidden');
      });
      container.append(button);
    });
  }

  function doc(key) {
    const titles = { report: 'Unterlagen', timeline: 'Audio', notice: 'Freigaben' };
    const descriptions = {
      report: `Im Original stehen für Bereich ${chosen} eigene Quellen und Unterlagen bereit. Diese öffentliche Ansicht zeigt die Lesefläche, aber weder Titel noch Inhalte der geschützten Dokumente.`,
      timeline: `Im Original sind Audio und weitere Medien dem Ermittlungsweg zugeordnet. Diese öffentliche Ansicht spielt kein Audio ab und verrät keine Titel oder Inhalte.`,
      notice: 'Im Original hängen die sichtbaren Bestandteile vom Gruppenstand, Zeitfenster und weiteren Freigaben ab. Diese Vorschau prüft oder erteilt keine solche Freigabe.',
    };
    $('archiveText').innerHTML = `<div class="archive-prose"><small>ANSICHTSRUNDGANG // BEREICH ${chosen}</small><h3>${titles[key]} · geschützter Inhalt</h3><p>${descriptions[key]}</p><aside>Dieser Wechsel zeigt nur die Oberfläche. Er ist weder Gruppenbeitritt noch Ermittlungsentscheidung.</aside></div>`;
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
