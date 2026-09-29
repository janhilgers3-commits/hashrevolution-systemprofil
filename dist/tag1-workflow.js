(() => {
  const $ = (id) => document.getElementById(id);
  const statusNames = { open: 'Offen', submitted: 'In Prüfung', revision: 'Revision offen', done: 'Abgeschlossen' };
  const hints = {
    open: 'Der Fall kann bearbeitet und zur Prüfung abgegeben werden.',
    submitted: 'Die Abgabe liegt im simulierten Prüfstand. Hier kann eine Revision angefordert oder der Abschluss bestätigt werden.',
    revision: 'Nur dieser Fall ist wieder zur Bearbeitung geöffnet. Andere abgeschlossene Reaktoren bleiben unverändert.',
    done: 'Dieser Fall ist bestätigt und kann in dieser Demo nicht mehr verändert werden.'
  };
  let statuses = Array(5).fill('open');
  let selected = 0;
  function render() {
    const grid = $('case-grid');
    grid.replaceChildren();
    statuses.forEach((status, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = (index === selected ? 'selected ' : '') + (status === 'done' ? 'done' : '');
      button.setAttribute('aria-pressed', String(index === selected));
      button.innerHTML = `<b>${String(index + 1).padStart(2, '0')}</b><span>${statusNames[status].toUpperCase()}</span>`;
      button.addEventListener('click', () => { selected = index; render(); });
      grid.append(button);
    });
    const current = statuses[selected];
    $('case-label').textContent = 'REAKTOR ' + String(selected + 1).padStart(2, '0');
    $('case-status').textContent = statusNames[current];
    $('case-hint').textContent = hints[current];
    $('case-submit').disabled = !['open', 'revision'].includes(current);
    $('case-revise').disabled = current !== 'submitted';
    $('case-approve').disabled = current !== 'submitted';
    const count = statuses.filter((status) => status === 'done').length;
    $('audit-status').textContent = count === 5
      ? 'Schlussaudit freigegeben · alle fünf Prüfstände abgeschlossen.'
      : `Schlussaudit gesperrt · ${count} von 5 Prüfständen abgeschlossen.`;
    $('audit-status').classList.toggle('unlocked', count === 5);
  }
  $('case-submit').addEventListener('click', () => { statuses[selected] = 'submitted'; render(); });
  $('case-revise').addEventListener('click', () => { statuses[selected] = 'revision'; render(); });
  $('case-approve').addEventListener('click', () => { statuses[selected] = 'done'; render(); });
  $('case-reset').addEventListener('click', () => { statuses = Array(5).fill('open'); selected = 0; render(); });
  render();
})();
