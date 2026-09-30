(() => {
  const quiz = [
    {
      view: '<div class="quiz-host"><div><small>HOST / SITZUNG</small><strong>Gemeinsam starten.</strong><p>Spielcode · ••••</p><div class="quiz-code">QR-MUSTER</div><span>Teilnehmende treten mit Namen und Sidekick bei.</span></div><div class="quiz-device"><small>MOBILGERÄT</small><strong>Sidekick wählen</strong><div class="quiz-avatar">✦</div><span>Warten auf den Start der Leitung</span></div></div>',
      action: 'Host startet eine Sitzung; Mobilgeräte treten per Code oder QR bei.',
      check: 'Die Sitzung führt Host und Teilnehmende im selben Fragenstand zusammen.',
      next: 'Eine zeitgesteuerte Frage wird auf beiden Ansichten sichtbar.',
      learning: 'Vorwissen wird als gemeinsamer Ausgangspunkt aktiviert.'
    },
    {
      view: '<div class="quiz-question"><div><small>HOST / FRAGE 01 VON 18</small><strong>Frageinhalt geschützt</strong><p>Die Leitung sieht die Frage und den Stand der eingegangenen Antworten.</p><div class="quiz-progress"><i></i></div><span>Antworten · beispielhafter Fortschritt</span></div><div class="quiz-device"><small>MOBILGERÄT / ANTWORT</small><strong>Wähle deine Kacheln</strong><div class="quiz-tiles"><span>A</span><span>B</span><span>C</span><span>D</span></div><span>Antwortfenster und Auswahl sind zeitlich begrenzt.</span></div></div>',
      action: 'Teilnehmende wählen Antwortkacheln und senden sie innerhalb des Zeitfensters.',
      check: 'Das System zählt eingegangene Antworten und schließt das Fenster nach der Frist.',
      next: 'Die Auflösung erscheint; anschließend folgt der Zwischenstand.',
      learning: 'Eigene Annahmen werden mit dem gemeinsamen Ergebnis verglichen.'
    },
    {
      view: '<div class="quiz-result"><small>HOST UND MOBIL / ZWISCHENSTAND</small><strong>Auswertung wird sichtbar.</strong><div class="quiz-rank"><span>Teilnahme 01</span><i style="width:78%"></i></div><div class="quiz-rank"><span>Teilnahme 02</span><i style="width:56%"></i></div><div class="quiz-rank"><span>Teilnahme 03</span><i style="width:35%"></i></div><p>Nach 18 Fragen führt die Sitzung zum Podium.</p></div>',
      action: 'Der Host zeigt die Auflösung und führt zur nächsten Frage.',
      check: 'Antworten, Punkte und Rangfolge werden im Sitzungsstand ausgewertet.',
      next: 'Zwischenstand oder am Ende das Podium.',
      learning: 'Rückmeldung und Diskussion knüpfen an tatsächliche Entscheidungen an.'
    }
  ];
  const archive = [
    { title: 'Primärbelege', sources: ['Zahlungs- und Dienstleisterspur', 'Transport-Header', 'Lokaler Forensikbefund'], fields: ['Cloud-/Archivdienst', 'Mandatsreferenz', 'Aussagekraft des Transport-Headers', 'Ergebnis der lokalen Auswertung'], action: 'Belegkette validieren', check: 'Dienstleister, Mailtransport und lokaler Befund müssen zusammenpassen.', next: 'Infrastrukturzugriff', learning: 'Nicht einen Einzelhinweis, sondern eine konsistente Ausgangslage belegen.' },
    { title: 'Infrastruktur', sources: ['Vertragsbestand', 'Knotenbestand', 'Ereignisprotokoll'], fields: ['Cluster / Instanz', 'Managed Storage', 'Systemereignis', 'Interaktives Ereignis'], action: 'Infrastrukturakte konsolidieren', check: 'Vertrag, Knoten und zeitbereinigte Ereignisse werden gemeinsam geprüft.', next: 'Archivindex', learning: 'Technische Zuordnung und Zeitbezug anhand mehrerer Quellen begründen.' },
    { title: 'Archivindex', sources: ['Archivdatensatz', 'Versionsverlauf', 'Herkunft und Metadaten'], fields: ['Archiv nach Dateicode oder Inhalt durchsuchen', 'Name und Score des wiederkehrenden Datensatzes', 'Quellenkritischer Befund zur zugeordneten Erklärung', 'Integritätsbefund zur Auswerteanweisung'], action: 'Belegkette validieren', check: 'Versionen, Herkunft und Metadaten müssen auf denselben Bestand verweisen.', next: 'Oracle-Audit', learning: 'Veränderungen und Provenienz einer Unterlage nachvollziehen.' },
    { title: 'Oracle-Audit', sources: ['IT-Kontrollen', 'Modellunterlagen', 'Gruppenwirkungsdaten'], fields: ['Servicekonto', 'Letzter Abruf (UTC)', 'Zentrale Proxymerkmale', 'Governance-Befund'], action: 'Kontrollsatz abgleichen', check: 'Kontrollen, Modellwirkung und regulatorische Folgen werden getrennt bewertet.', next: 'Abschlussvalidierung', learning: 'Technische Qualität nicht mit fachlicher oder gesellschaftlicher Eignung verwechseln.' },
    { title: 'Abschlussvalidierung', sources: ['Sechs verkettete Records', 'Quellwerte', 'Belegzuordnung'], fields: ['Einzelbetrag des Quellrecords (amount)', 'Quellrecord für diesen Einzelbetrag', 'account', 'Quellrecord für account', 'clock_delta', 'Quellrecord für clock_delta'], action: 'Prüfsatz validieren', check: 'Verkettung, Zeitfolge und Quellwertbelege müssen konsistent sein.', next: 'Geschützter Archivzugang', learning: 'Eine Schlussfolgerung nur mit reproduzierbarer Belegkette freigeben.' }
  ];
  const handoff = [
    {
      view: '<div class="handoff-terminal"><div class="terminal-top"><b>ARCHIVE RECOVERY</b><span>PRÜFSTAND</span></div><code>Abschlussprüfung<br>[ ] Record-Kette prüfen<br>[ ] Quellwerte zuordnen<br>[ ] Freigabe erst nach konsistentem Stand</code><div class="terminal-meter"><i style="width:18%"></i></div></div>',
      action: 'Die letzte Phase verknüpft sechs Records mit ihren Quellwerten.',
      check: 'Vor einem Übergang werden Reihenfolge, Verknüpfung und Belege geprüft.',
      next: 'Erst ein konsistenter Stand ermöglicht die Freigabe des Archivknotens.',
      learning: 'Die Grenze zwischen Vermutung und belastbarer Freigabe sichtbar machen.'
    },
    {
      view: '<div class="handoff-terminal"><div class="terminal-top"><b>ARCHIVE RECOVERY</b><span>KNOTEN FREI</span></div><code>[OK] Prüfstand konsistent<br>[OK] Sitzungsbindung bestätigt<br>[OK] Versiegelter Archivknoten zugänglich</code><div class="terminal-cta">Originalschaltfläche: Versiegelten Archivknoten öffnen</div><div class="terminal-meter"><i style="width:72%"></i></div></div>',
      action: 'Nach zulässiger Freigabe öffnet die Person den versiegelten Knoten.',
      check: 'Der Zugang bleibt an die bestehende Sitzung gebunden.',
      next: 'Eine getrennte geschützte Oberfläche übernimmt den Vorgang.',
      learning: 'Übergaben als kontrollierte Zustandswechsel verstehen.'
    },
    {
      view: '<div class="handoff-terminal"><div class="terminal-top"><b>ARCHIVE RECOVERY TERMINAL</b><span>ENCRYPTED SESSION</span></div><code>SECURE HANDOFF IN PROGRESS<br>Validating Archive Recovery session…<br><br>Interner Inhalt in der öffentlichen Ansicht verdeckt.</code><div class="terminal-meter"><i style="width:100%"></i></div></div>',
      action: 'Der geschützte Anschluss prüft die übergebene Sitzung.',
      check: 'Ohne gültige Übergabe bleibt die Fortsetzung gesperrt.',
      next: 'Die weitere Auflösung findet ausschließlich im Spiel statt.',
      learning: 'Autorisierung, Erzählung und Reflexion bleiben unterscheidbare Schritte.'
    }
  ];

  function caption(item, action) {
    return `<div><small>AKTION</small><span>${action}</span></div><div><small>SYSTEMPRÜFUNG</small><span>${item.check}</span></div><div><small>NÄCHSTER ZUSTAND</small><span>${item.next}</span></div><div><small>LERNLEISTUNG</small><span>${item.learning}</span></div>`;
  }
  function render(name, index) {
    const buttons = document.querySelectorAll(`[data-trace="${name}"]`);
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.step) === index)));
    const view = document.getElementById(`${name}-trace-view`);
    const note = document.getElementById(`${name}-trace-caption`);
    if (name === 'archive') {
      const item = archive[index];
      view.innerHTML = `<div class="archive-preview-head"><span>ARCHIVE RECOVERY / PHASE ${index + 1} VON 5</span><strong>${item.title}</strong></div><div class="archive-preview-split"><div><small>QUELLENANSICHT · SCHEMATISCH</small>${item.sources.map((source) => `<div class="archive-source">${source}</div>`).join('')}</div><div><small>ARBEITSFLÄCHE · FELDER SCHEMATISCH</small>${item.fields.map((field) => `<div class="archive-field"><span>${field}</span><i>Auswahl / Eingabe</i></div>`).join('')}<div class="archive-action">Im Spiel: ${item.action}</div></div></div>`;
      note.innerHTML = caption(item, `Quellen öffnen, zuordnen und „${item.action}“ auslösen.`);
    } else {
      const item = (name === 'quiz' ? quiz : handoff)[index];
      view.innerHTML = item.view;
      note.innerHTML = caption(item, item.action);
    }
  }
  document.querySelectorAll('[data-trace]').forEach((button) => button.addEventListener('click', () => render(button.dataset.trace, Number(button.dataset.step))));
  render('quiz', 0);
  render('archive', 0);
  render('handoff', 0);
})();
