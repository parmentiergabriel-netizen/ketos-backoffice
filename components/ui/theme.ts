export type Theme = "light" | "dark";
const KEY = "ketos-theme";

export function currentTheme(): Theme {
  const forced = document.documentElement.dataset.theme;
  if (forced === "light" || forced === "dark") return forced;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(KEY, t); } catch { /* stockage indisponible : thème non mémorisé */ }
}

/** Script inline exécuté avant le rendu pour éviter le flash de thème. */
export const themeBootScript =
  `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
