// The data model: look up postures, resolve a form into steps, and validate the data so
// mistakes in hand-edited content show up as test failures instead of broken screens.
import { ATTACKS, ENERGIES } from "./data/vocabulary.js";
import { POSTURES } from "./data/postures.js";
import yang28 from "./data/forms/yang-28.js";

/** Every form the app offers. Add a new form file here (e.g. yang-85.js). */
export const FORMS = [yang28];

const postureById = new Map(POSTURES.map((p) => [p.id, p]));

export function getPosture(id) {
  const posture = postureById.get(id);
  if (!posture) throw new Error(`Unknown posture: ${id}`);
  return posture;
}

export function getForm(id) {
  const form = FORMS.find((f) => f.id === id);
  if (!form) throw new Error(`Unknown form: ${id}`);
  return form;
}

/** A form's steps with their postures attached, numbered from 1. */
export function formSteps(form) {
  return form.steps.map((step, i) => ({
    number: i + 1,
    note: step.note ?? null,
    posture: getPosture(step.posture),
  }));
}

/** The distinct postures of a form, in order of first appearance. */
export function formPostures(form) {
  return [...new Set(form.steps.map((s) => s.posture))].map(getPosture);
}

/** Every application in a form, each with its posture attached. */
export function formApplications(form) {
  return formPostures(form).flatMap((posture) =>
    posture.applications.map((app) => ({ ...app, posture })),
  );
}

/**
 * Check postures and forms for missing fields, unknown ids and duplicates.
 * Returns a list of human-readable problems; an empty list means the data is valid.
 */
export function validate(postures = POSTURES, forms = FORMS) {
  const problems = [];
  const ids = new Set();
  const appIds = new Set();
  const need = (cond, msg) => cond || problems.push(msg);

  for (const p of postures) {
    const where = `posture ${p.id ?? "(no id)"}`;
    need(typeof p.id === "string" && /^[a-z0-9-]+$/.test(p.id), `${where}: id must be kebab-case`);
    need(!ids.has(p.id), `${where}: duplicate id`);
    ids.add(p.id);
    for (const field of ["name", "pinyin", "hanzi", "principle"]) {
      need(typeof p[field] === "string" && p[field].trim(), `${where}: missing ${field}`);
    }
    need(Array.isArray(p.cues) && p.cues.length > 0, `${where}: needs at least one cue`);
    need(Array.isArray(p.energies), `${where}: energies must be a list`);
    for (const e of p.energies ?? []) need(e in ENERGIES, `${where}: unknown energy "${e}"`);
    need(Array.isArray(p.applications) && p.applications.length > 0, `${where}: needs at least one application`);

    for (const a of p.applications ?? []) {
      const aw = `${where}, application ${a.id ?? "(no id)"}`;
      need(typeof a.id === "string" && a.id, `${aw}: missing id`);
      need(!appIds.has(a.id), `${aw}: duplicate application id`);
      appIds.add(a.id);
      need(a.attack in ATTACKS, `${aw}: unknown attack "${a.attack}"`);
      for (const field of ["scenario", "response", "keyPoint"]) {
        need(typeof a[field] === "string" && a[field].trim(), `${aw}: missing ${field}`);
      }
      need(Array.isArray(a.energies) && a.energies.length > 0, `${aw}: needs energies`);
      for (const e of a.energies ?? []) {
        need(e in ENERGIES, `${aw}: unknown energy "${e}"`);
        need(p.energies?.includes(e), `${aw}: energy "${e}" missing from the posture's energies`);
      }
    }
  }

  const formIds = new Set();
  for (const f of forms) {
    const where = `form ${f.id ?? "(no id)"}`;
    need(!formIds.has(f.id), `${where}: duplicate id`);
    formIds.add(f.id);
    need(typeof f.name === "string" && f.name, `${where}: missing name`);
    need(Array.isArray(f.steps) && f.steps.length > 0, `${where}: needs steps`);
    (f.steps ?? []).forEach((s, i) => need(ids.has(s.posture), `${where}, step ${i + 1}: unknown posture "${s.posture}"`));
  }
  return problems;
}
