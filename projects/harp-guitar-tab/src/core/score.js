// Play-along scoring: compare the notes you played with the tab's notes.

/**
 * Match played notes to target notes by onset time and pitch.
 * @param {{id?, time:number, pitches:number[]}[]} targets  tab events (one pitch per note;
 *   for chords any of its notes counts)
 * @param {{time:number, pitch:number}[]} played  your notes, on the same timeline
 * @param {{ window?: number }} options  how far (s) an onset may be from the target
 * @returns {{ results: {id, status: "hit"|"wrong"|"miss", offset?: number, played?: number}[],
 *             hits: number, total: number, accuracy: number, extras: number }}
 */
export function scoreTake(targets, played, { window = 0.15 } = {}) {
  const used = new Set();
  const nearest = (target, accept) => {
    let best = -1;
    let bestDist = Infinity;
    played.forEach((p, k) => {
      const dist = Math.abs(p.time - target.time);
      if (!used.has(k) && dist <= window && dist < bestDist && accept(p)) [best, bestDist] = [k, dist];
    });
    return best;
  };

  // First pass: right pitch. Second pass: something played at the right time.
  const results = targets.map((t) => ({ id: t.id, status: "miss" }));
  targets.forEach((t, i) => {
    const k = nearest(t, (p) => t.pitches.includes(p.pitch));
    if (k >= 0) {
      used.add(k);
      results[i] = { id: t.id, status: "hit", offset: played[k].time - t.time, played: played[k].pitch };
    }
  });
  targets.forEach((t, i) => {
    if (results[i].status !== "miss") return;
    const k = nearest(t, () => true);
    if (k >= 0) {
      used.add(k);
      results[i] = { id: t.id, status: "wrong", offset: played[k].time - t.time, played: played[k].pitch };
    }
  });

  const hits = results.filter((r) => r.status === "hit").length;
  return {
    results,
    hits,
    total: targets.length,
    accuracy: targets.length ? hits / targets.length : 0,
    extras: played.length - used.size,
  };
}

/** Average timing of the hits in seconds (+ = you play late). Null without hits. */
export function meanOffset({ results }) {
  const offsets = results.filter((r) => r.status === "hit").map((r) => r.offset);
  return offsets.length ? offsets.reduce((a, b) => a + b, 0) / offsets.length : null;
}

/**
 * Typical timing offset (s, + = late) between targets and the nearest played note of the
 * same pitch within ±maxShift. Unlike meanOffset it works when timing is so far off that
 * nothing counted as a hit — which is exactly when you need to calibrate. Null if nothing pairs.
 */
export function estimateOffset(targets, played, { maxShift = 0.5 } = {}) {
  const offsets = [];
  for (const t of targets) {
    let best = null;
    for (const p of played) {
      const d = p.time - t.time;
      if (t.pitches.includes(p.pitch) && Math.abs(d) <= maxShift && (best === null || Math.abs(d) < Math.abs(best))) best = d;
    }
    if (best !== null) offsets.push(best);
  }
  if (!offsets.length) return null;
  offsets.sort((a, b) => a - b);
  const mid = offsets.length >> 1;
  return offsets.length % 2 ? offsets[mid] : (offsets[mid - 1] + offsets[mid]) / 2;
}
