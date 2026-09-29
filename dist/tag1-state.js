export const DECISIONS = ['plausibel', 'unklar', 'widerspruch'];

export function initialDemoState() {
  return {
    statuses: Array(5).fill('open'),
    activeCase: 1,
    decisions: Array(5).fill(''),
    notes: Array(5).fill(''),
  };
}

export function isQualified(status) {
  return status === 'pending' || status === 'approved';
}

export function auditEligible(state) {
  return state.statuses.every(isQualified);
}

export function canOpenCase(state, id) {
  if (id === 6) return auditEligible(state);
  return Number.isInteger(id) && id >= 1 && id <= 5
    && id <= state.activeCase && !isQualified(state.statuses[id - 1]);
}

export function reactorSnapshot(state) {
  const eligible = auditEligible(state);
  const reactors = state.statuses.map((status, index) => {
    const id = index + 1;
    const locked = id > state.activeCase;
    const qualified = isQualified(status);
    return {
      id,
      sealed: qualified,
      qualified,
      openable: !locked && !qualified,
      visual: locked ? 'locked' : qualified ? 'submitted' : status === 'revision' ? 'revision' : 'active',
    };
  });
  reactors.push({ id: 6, sealed: false, qualified: false, openable: eligible, visual: eligible ? 'active' : 'locked' });
  return { reactors, charged: state.statuses.map(isQualified), auditEligible: eligible };
}

export function submitDemoCase(state, id, decision, note) {
  if (!canOpenCase(state, id) || id === 6) throw new Error('Dieser Reaktor ist nicht zur Abgabe freigegeben.');
  if (!DECISIONS.includes(decision)) throw new Error('Bitte eine Prüfentscheidung auswählen.');
  if (String(note).trim().length < 8) throw new Error('Bitte den Belegvermerk mit mindestens acht Zeichen ergänzen.');
  const index = id - 1;
  const next = {
    ...state,
    statuses: [...state.statuses],
    decisions: [...state.decisions],
    notes: [...state.notes],
    activeCase: Math.min(6, Math.max(state.activeCase, id + 1)),
  };
  next.statuses[index] = 'pending';
  next.decisions[index] = decision;
  next.notes[index] = String(note).trim();
  return next;
}

export function applyDemoReview(state, id, action) {
  if (!Number.isInteger(id) || id < 1 || id > 5 || state.statuses[id - 1] !== 'pending') {
    throw new Error('Nur eine eingegangene Abgabe kann geprüft werden.');
  }
  if (!['approved', 'revision'].includes(action)) throw new Error('Unbekanntes Leitungsereignis.');
  const next = { ...state, statuses: [...state.statuses] };
  next.statuses[id - 1] = action;
  return next;
}
