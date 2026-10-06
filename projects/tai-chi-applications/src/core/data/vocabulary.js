// Shared vocabulary for every form: the eight energies (ba jin) and the attack types
// that applications respond to. Postures and quizzes refer to these by id.

/** The eight energies (八法 bā fǎ). */
export const ENERGIES = {
  peng: { pinyin: "Péng", hanzi: "掤", english: "Ward off", summary: "Rounded, buoyant outward support that absorbs and rebounds." },
  lu: { pinyin: "Lǚ", hanzi: "捋", english: "Roll back", summary: "Yield and lead an incoming force past you with the waist." },
  ji: { pinyin: "Jǐ", hanzi: "挤", english: "Press", summary: "Compress forward with joined hands or forearm into a gap." },
  an: { pinyin: "Àn", hanzi: "按", english: "Push", summary: "Sink, then push from the legs, often downward then forward." },
  cai: { pinyin: "Cǎi", hanzi: "採", english: "Pluck", summary: "A sudden downward pull that breaks the opponent's root." },
  lie: { pinyin: "Liè", hanzi: "挒", english: "Split", summary: "Opposing forces in two directions: arm locks, throws, spirals." },
  zhou: { pinyin: "Zhǒu", hanzi: "肘", english: "Elbow", summary: "Elbow strikes and elbow control at close range." },
  kao: { pinyin: "Kào", hanzi: "靠", english: "Shoulder", summary: "Bump with the shoulder, back or hip when there is no room for hands." },
};

/**
 * Attack types. `attacker` is the instruction read by the partner playing the attacker
 * in a drill; keep it slow and specific.
 */
export const ATTACKS = {
  "straight-punch": { label: "Straight punch", attacker: "Step in with a slow straight punch to the chest or face." },
  "hook-punch": { label: "Hook / swing", attacker: "Throw a slow, wide hook or swinging punch at head height." },
  "overhead-strike": { label: "Overhead strike", attacker: "Bring a forearm or padded stick down from above toward the head." },
  "front-kick": { label: "Front kick", attacker: "Lift a slow front kick toward the stomach. No contact on the follow-through." },
  "low-kick": { label: "Low kick", attacker: "Swing a slow, light kick at the shin or knee." },
  "wrist-grab": { label: "Wrist grab", attacker: "Grab the partner's wrist firmly and hold or pull." },
  "lapel-grab": { label: "Lapel / chest grab", attacker: "Grab the partner's collar or shirt front with one or both hands." },
  push: { label: "Two-hand push", attacker: "Push into the partner's chest or arms with both hands, steadily." },
  tackle: { label: "Charge / tackle", attacker: "Lower your stance and walk forward into the partner's waist, slowly." },
  "rear-attack": { label: "Attack from behind", attacker: "Approach from behind and reach for the shoulder or push the back." },
};

export const ENERGY_IDS = Object.keys(ENERGIES);
export const ATTACK_IDS = Object.keys(ATTACKS);
