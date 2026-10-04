// Scenario quiz and partner drills built from a form's applications.
import { ATTACKS } from "./data/vocabulary.js";
import { formApplications, formPostures } from "./forms.js";
import { pick, shuffle } from "./random.js";

/** Attack types used in a form, with how many applications answer each. */
export function attacksInForm(form) {
  const counts = new Map();
  for (const app of formApplications(form)) counts.set(app.attack, (counts.get(app.attack) ?? 0) + 1);
  return [...counts].map(([id, count]) => ({ id, label: ATTACKS[id].label, count }));
}

/**
 * A multiple-choice question: "this happens; which posture answers it?"
 * Distractors are postures from the same form that have no application for this attack
 * type, so only one choice is right. Falls back to any other posture if there are too few.
 */
export function quizQuestion(form, { attack = null, random = Math.random, choices = 4 } = {}) {
  const apps = formApplications(form).filter((a) => !attack || a.attack === attack);
  if (apps.length === 0) throw new Error(`No applications for attack "${attack}" in ${form.id}`);
  const app = pick(apps, random);
  const others = formPostures(form).filter((p) => p.id !== app.posture.id);
  const clean = others.filter((p) => !p.applications.some((a) => a.attack === app.attack));
  const pool = shuffle(clean, random);
  if (pool.length < choices - 1) pool.push(...shuffle(others.filter((p) => !clean.includes(p)), random));
  const options = shuffle([app.posture, ...pool.slice(0, choices - 1)], random);
  return { app, attack: ATTACKS[app.attack], options, answer: app.posture.id };
}

/** A partner drill: the attacker's instruction and the defender's application. */
export function partnerDrill(form, { attack = null, random = Math.random, exclude = null } = {}) {
  let apps = formApplications(form).filter((a) => !attack || a.attack === attack);
  if (apps.length > 1 && exclude) apps = apps.filter((a) => a.id !== exclude);
  if (apps.length === 0) throw new Error(`No applications for attack "${attack}" in ${form.id}`);
  const app = pick(apps, random);
  return {
    app,
    attacker: { attack: ATTACKS[app.attack].label, instruction: ATTACKS[app.attack].attacker, scenario: app.scenario },
    defender: { posture: app.posture, response: app.response, keyPoint: app.keyPoint },
  };
}
