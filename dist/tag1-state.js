// Public camera tour only. These visual states are not submissions or approvals.
export function initialTourStep() {
  return 1;
}

export function canVisit(step, id) {
  return Number.isInteger(step) && Number.isInteger(id)
    && step >= 1 && step <= 6 && id === step;
}

export function nextTourStep(step) {
  if (!Number.isInteger(step) || step < 1 || step > 6) throw new Error('Ungültige Station.');
  return Math.min(step + 1, 6);
}

export function tourSnapshot(step) {
  if (!Number.isInteger(step) || step < 1 || step > 6) throw new Error('Ungültige Station.');
  const reactors = Array.from({ length: 5 }, (_, index) => {
    const id = index + 1;
    const viewed = id < step;
    const active = id === step;
    return {
      id,
      sealed: viewed,
      qualified: viewed,
      openable: active,
      visual: viewed ? 'submitted' : active ? 'active' : 'locked',
    };
  });
  const auditVisible = step === 6;
  reactors.push({ id: 6, sealed: false, qualified: false, openable: auditVisible, visual: auditVisible ? 'active' : 'locked' });
  return { reactors, charged: reactors.slice(0, 5).map((reactor) => reactor.sealed), auditEligible: auditVisible };
}
