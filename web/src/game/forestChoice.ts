// Which database the start screen last opened, remembered on this device, and
// switching to another. Switching reloads: the whole orchard regrows.

const FOREST_CHOICE_KEY = "kpd-forest";

/** The database chosen last on this device, or null. */
export function savedForest(): string | null {
  try {
    return window.localStorage.getItem(FOREST_CHOICE_KEY);
  } catch {
    return null;
  }
}

/** Open another database: remember it, drop links into this one, and reload. */
export function switchForest(slug: string): void {
  try {
    window.localStorage.setItem(FOREST_CHOICE_KEY, slug);
  } catch {
    /* private mode */
  }
  const url = new URL(window.location.href);
  for (const p of ["forest", "home", "tree"]) url.searchParams.delete(p);
  window.location.assign(url.toString());
}
