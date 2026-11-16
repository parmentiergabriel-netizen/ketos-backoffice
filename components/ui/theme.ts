export type Theme = "light" | "dark";
/** Choix de l'utilisateur : un thème forcé, ou « system » pour suivre le réglage de l'appareil. */
export type ThemePref = Theme | "system";
const KEY = "ketos-theme";

/** Thème réellement affiché (forcé, sinon celui du système). */
export function currentTheme(): Theme {
  const forced = document.documentElement.dataset.theme;
  if (forced === "light" || forced === "dark") return forced;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function themePref(): ThemePref {
  const forced = document.documentElement.dataset.theme;
  return forced === "light" || forced === "dark" ? forced : "system";
}

export function setThemePref(p: ThemePref) {
  const root = document.documentElement;
  if (p === "system") delete root.dataset.theme;
  else root.dataset.theme = p;
  try {
    if (p === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, p);
  } catch { /* stockage indisponible : choix non mémorisé */ }
}

/** Script inline exécuté avant le rendu pour éviter le flash de thème. */
export const themeBootScript =
  `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
