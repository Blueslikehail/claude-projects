// Your licks and tabs, kept only in this browser (localStorage). Export writes a file you
// can import on another device; nothing is sent anywhere.

const LICKS_KEY = "harp-tab.myLicks";
const TABS_KEY = "harp-tab.myTabs";

function load(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

/** @returns {boolean} false when the browser refused (private mode, storage full) */
function save(key, items) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

export const loadLicks = () => load(LICKS_KEY);
export const saveLicks = (licks) => save(LICKS_KEY, licks);
export const loadTabs = () => load(TABS_KEY);
export const saveTabs = (tabs) => save(TABS_KEY, tabs);

export const newId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;

/** Download everything as one JSON file. */
export function exportAll() {
  const data = { app: "harp-tab", version: 2, licks: loadLicks(), tabs: loadTabs() };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "my-harp-licks-and-tabs.json" });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Read an export (this format, or the older licks-only array).
 * @returns {Promise<{ licks: object[], tabs: object[] }>}
 */
export async function readExport(file) {
  const data = JSON.parse(await file.text());
  if (Array.isArray(data)) return { licks: data, tabs: [] };
  return { licks: Array.isArray(data?.licks) ? data.licks : [], tabs: Array.isArray(data?.tabs) ? data.tabs : [] };
}
