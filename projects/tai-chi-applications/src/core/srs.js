// Spaced repetition for study cards, a simplified SM-2.
//
// Each application gives two cards:
//   "<appId>:forward"  posture + attack  -> response
//   "<appId>:reverse"  scenario          -> posture
// Card state is plain JSON so the app can keep it in localStorage.

const DAY = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;

export const GRADES = { again: 0, hard: 1, good: 2, easy: 3 };

export function cardsFor(applications) {
  return applications.flatMap((app) => [
    { id: `${app.id}:forward`, kind: "forward", app },
    { id: `${app.id}:reverse`, kind: "reverse", app },
  ]);
}

export function newCardState() {
  return { reps: 0, lapses: 0, ease: 2.5, interval: 0, due: 0 };
}

/**
 * The next state after answering a card. `interval` is in days; `due` is a timestamp.
 * Again: back in 10 minutes. Hard: 1.2x. Good: 1, 3, then x ease. Easy: a bigger step.
 */
export function review(state, grade, now = Date.now()) {
  const s = { ...newCardState(), ...state };
  if (grade === GRADES.again) {
    return { ...s, reps: 0, lapses: s.lapses + 1, ease: Math.max(MIN_EASE, s.ease - 0.2), interval: 0, due: now + 10 * 60 * 1000 };
  }
  const ease = Math.max(MIN_EASE, s.ease + [0, -0.15, 0, 0.15][grade]);
  let interval;
  if (s.reps === 0) interval = [0, 1, 1, 3][grade];
  else if (s.reps === 1) interval = [0, 2, 3, 6][grade];
  else interval = s.interval * [0, 1.2, ease, ease * 1.3][grade];
  interval = Math.max(1, Math.round(interval));
  return { ...s, reps: s.reps + 1, ease, interval, due: now + interval * DAY };
}

/**
 * The cards to study now: everything due (most overdue first), then up to `newLimit`
 * cards never seen before, in their original order.
 */
export function dueCards(cards, states, { now = Date.now(), newLimit = 10 } = {}) {
  const due = cards
    .filter((c) => states[c.id] && states[c.id].due <= now)
    .sort((a, b) => states[a.id].due - states[b.id].due);
  const fresh = cards.filter((c) => !states[c.id]).slice(0, newLimit);
  return [...due, ...fresh];
}

export function studyStats(cards, states, now = Date.now()) {
  let due = 0, fresh = 0, learned = 0;
  for (const c of cards) {
    const s = states[c.id];
    if (!s) fresh++;
    else if (s.due <= now) due++;
    else learned++;
  }
  return { due, fresh, learned, total: cards.length };
}
