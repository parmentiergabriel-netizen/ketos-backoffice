import { useEffect, useState } from "react";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Anime un nombre de 0 (ou de sa valeur précédente) jusqu'à `target`. */
export function useCountUp(target: number, ms = 1100): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (reduced()) { setValue(target); return; }
    let raf = 0;
    const from = value;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 4);
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ms]);
  return value;
}

/** Pluie de confettis aux couleurs Ketos. */
export function confetti(count = 90) {
  if (typeof document === "undefined" || reduced()) return;
  const colors = ["#0b7cff", "#14c4b0", "#6c4cff", "#ffd166", "#ff6b9a", "#ffffff"];
  const root = document.createElement("div");
  root.className = "confetti";
  for (let i = 0; i < count; i++) {
    const p = document.createElement("i");
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length];
    p.style.setProperty("--dx", `${(Math.random() - 0.5) * 300}px`);
    p.style.setProperty("--r", `${(Math.random() - 0.5) * 1440}deg`);
    p.style.animationDuration = `${1.8 + Math.random() * 1.6}s`;
    p.style.animationDelay = `${Math.random() * 0.4}s`;
    root.appendChild(p);
  }
  document.body.appendChild(root);
  setTimeout(() => root.remove(), 4000);
}
