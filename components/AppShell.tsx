import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { logout } from "../lib/auth";
import { useAuth } from "./AuthProvider";
import { useItems } from "./ItemsProvider";
import { Icon, IconName } from "./ui/Icon";
import { Brand } from "./ui/Logo";
import { currentTheme, setThemePref, Theme, ThemePref, themePref } from "./ui/theme";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Tableau de bord", icon: "home" },
  { href: "/demo", label: "Éléments", icon: "list" },
];

function Avatar() {
  const auth = useAuth();
  const [broken, setBroken] = useState(false);
  if (auth.status !== "staff") return null;
  const { photoURL, displayName, email } = auth.user;
  const initials = (displayName || email || "?").split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(s => s[0]!.toUpperCase()).join("");
  // eslint-disable-next-line @next/next/no-img-element
  if (photoURL && !broken) return <img className="avatar" src={photoURL} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
  return <span className="avatar">{initials}</span>;
}

type ThemeState = { pref: ThemePref | null; resolved: Theme | null; setPref: (p: ThemePref) => void };

/** Préférence de thème (clair / sombre / système) et thème effectivement affiché. */
function useTheme(): ThemeState {
  const [pref, setPrefState] = useState<ThemePref | null>(null);
  const [resolved, setResolved] = useState<Theme | null>(null);

  useEffect(() => {
    setPrefState(themePref());
    setResolved(currentTheme());
    // En mode « système », suit les changements de réglage de l'appareil.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(currentTheme());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setPref = useCallback((p: ThemePref) => {
    setThemePref(p);
    setPrefState(p);
    setResolved(currentTheme());
  }, []);

  return { pref, resolved, setPref };
}

const THEMES: { value: ThemePref; label: string; icon: IconName }[] = [
  { value: "light", label: "Clair", icon: "sun" },
  { value: "dark", label: "Sombre", icon: "moon" },
  { value: "system", label: "Auto", icon: "monitor" },
];

/** Menu du compte, ouvert depuis l'avatar : thème, raccourcis, déconnexion. */
function UserMenu({ placement, theme, mod, onSearch }: {
  placement: "up" | "down"; theme: ThemeState; mod: string; onSearch: () => void;
}) {
  const auth = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const user = auth.status === "staff" ? auth.user : null;
  const name = user?.displayName || "Membre de l’équipe";

  const close = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!anchorRef.current?.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(true); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, close]);

  // Ferme le menu en changeant de page.
  useEffect(() => { setOpen(false); }, [router.pathname]);

  const run = (fn: () => void) => () => { close(); fn(); };

  return (
    <div className="menu-anchor" ref={anchorRef}>
      {placement === "up" ? (
        <button ref={buttonRef} className="user-chip" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
          <Avatar />
          <div className="who">
            <b>{user?.displayName?.split(" ")[0] || name}</b>
            <span>{user?.email}</span>
          </div>
          <Icon name="chevrons" size={16} className="chev" />
        </button>
      ) : (
        <button ref={buttonRef} className="avatar-btn" aria-label="Menu du compte" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
          <Avatar />
        </button>
      )}

      {open && (
        <div className={`menu ${placement}`} role="menu" aria-label="Compte">
          {placement === "down" && (
            <div className="menu-who"><b>{name}</b><span>{user?.email}</span></div>
          )}
          <div className="menu-label" id="theme-label">Thème</div>
          <div className="seg" role="radiogroup" aria-labelledby="theme-label">
            {THEMES.map(t => (
              <button key={t.value} role="radio" aria-checked={theme.pref === t.value} onClick={() => theme.setPref(t.value)}>
                <Icon name={t.icon} size={14} /> {t.label}
              </button>
            ))}
          </div>
          <div className="menu-sep" />
          <button className="menu-item" role="menuitem" onClick={run(onSearch)}>
            <Icon name="search" size={16} /> Rechercher <span className="kbd">{mod} K</span>
          </button>
          <button className="menu-item" role="menuitem" onClick={run(() => router.push("/demo?new=1"))}>
            <Icon name="plus" size={16} /> Nouvel élément <span className="kbd">N</span>
          </button>
          <div className="menu-sep" />
          <button className="menu-item danger" role="menuitem" onClick={run(() => { logout(); })}>
            <Icon name="logout" size={16} /> Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}

const ITEMS_GROUP = "Mes éléments";

type Command = { id: string; group: string; label: string; icon: IconName; hint?: string; run: () => void };

function CommandPalette({ open, onClose, commands }: { open: boolean; onClose: () => void; commands: Command[] }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      setQ(""); setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      // Rend le focus à l'élément qui avait ouvert la palette.
      returnFocus.current?.focus?.();
      returnFocus.current = null;
    }
  }, [open]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const matches = needle ? commands.filter(c => c.label.toLowerCase().includes(needle)) : commands;
    // Les éléments sont nombreux : 3 récents sans recherche, 8 résultats au plus avec.
    let shownItems = 0;
    return matches.filter(c => c.group !== ITEMS_GROUP || ++shownItems <= (needle ? 8 : 3));
  }, [q, commands]);

  // Garde l'option active visible pendant la navigation au clavier.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const run = (c?: Command) => { if (!c) return; onClose(); c.run(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(results.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(results.length - 1); }
    else if (e.key === "Enter") { e.preventDefault(); run(results[active]); }
    else if (e.key === "Escape") onClose();
    else if (e.key === "Tab") e.preventDefault(); // le focus reste dans la palette
  };

  const optionId = (i: number) => `cmdk-opt-${i}`;
  let lastGroup = "";
  return (
    <div className="cmdk-overlay" onMouseDown={onClose}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Palette de commandes" onMouseDown={e => e.stopPropagation()}>
        <div className="cmdk-input">
          <Icon name="search" />
          <input ref={inputRef} value={q} placeholder="Rechercher une page, une action, un élément…" onKeyDown={onKey}
            role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-autocomplete="list"
            aria-activedescendant={results[active] ? optionId(active) : undefined}
            onChange={e => { setQ(e.target.value); setActive(0); }} />
          <span className="kbd">Échap</span>
        </div>
        <div className="cmdk-list" id="cmdk-list" role="listbox" aria-label="Résultats" ref={listRef}>
          {results.length === 0 && <div className="empty">Aucun résultat pour « {q} »</div>}
          {results.map((c, i) => {
            const header = c.group !== lastGroup ? <div className="cmdk-group" role="presentation">{c.group}</div> : null;
            lastGroup = c.group;
            return (
              <div key={c.id} role="presentation">
                {header}
                <div id={optionId(i)} data-index={i} role="option" aria-selected={i === active}
                  className={`cmdk-item ${i === active ? "on" : ""}`} onMouseMove={() => setActive(i)} onClick={() => run(c)}>
                  <span className="ci"><Icon name={c.icon} size={15} /></span>
                  {c.label}
                  {c.hint && <span className="hint">{c.hint}</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="cmdk-foot">
          <span><span className="kbd">↑</span><span className="kbd">↓</span> naviguer</span>
          <span><span className="kbd">↵</span> ouvrir</span>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { items } = useItems();
  const theme = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mac, setMac] = useState(true);
  const mod = mac ? "⌘" : "Ctrl";
  const openPalette = useCallback(() => setPaletteOpen(true), []);

  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen(o => !o); return; }
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "n") { e.preventDefault(); router.push("/demo?new=1"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const dark = theme.resolved === "dark";
  const { pref, setPref } = theme;
  const commands: Command[] = useMemo(() => [
    ...NAV.map(n => ({ id: n.href, group: "Navigation", label: n.label, icon: n.icon, run: () => router.push(n.href) })),
    { id: "new", group: "Actions", label: "Créer un élément", icon: "plus", hint: "N", run: () => router.push("/demo?new=1") },
    { id: "theme", group: "Actions", label: dark ? "Passer en thème clair" : "Passer en thème sombre", icon: dark ? "sun" : "moon", run: () => setPref(dark ? "light" : "dark") },
    ...(pref !== "system" ? [{ id: "theme-auto", group: "Actions", label: "Suivre le thème de l’appareil", icon: "monitor" as IconName, run: () => setPref("system") }] : []),
    ...items.map(it => ({ id: `item-${it.id}`, group: ITEMS_GROUP, label: it.title, icon: "sparkle" as IconName, run: () => router.push(`/demo?focus=${it.id}`) })),
    { id: "logout", group: "Compte", label: "Se déconnecter", icon: "logout", run: () => { logout(); } },
  ], [router, dark, pref, setPref, items]);

  const navLinks = NAV.map(n => (
    <Link key={n.href} href={n.href} className={`nav-link ${router.pathname === n.href ? "active" : ""}`}
      aria-current={router.pathname === n.href ? "page" : undefined}>
      <Icon name={n.icon} /> {n.label}
    </Link>
  ));

  return (
    <div className="shell">
      <aside className="sidebar">
        <Brand />
        <button className="search-trigger" onClick={openPalette}>
          <Icon name="search" size={16} /> Rechercher
          <span className="kbd">{mod} K</span>
        </button>
        <nav aria-label="Navigation principale" className="side-nav">{navLinks}</nav>
        <div className="sidebar-foot">
          <UserMenu placement="up" theme={theme} mod={mod} onSearch={openPalette} />
        </div>
      </aside>

      <div>
        <header className="topbar-mobile">
          <Brand />
          <span className="spacer" />
          <button className="btn btn-ghost btn-icon" aria-label="Rechercher" onClick={openPalette}><Icon name="search" /></button>
          <UserMenu placement="down" theme={theme} mod={mod} onSearch={openPalette} />
        </header>
        <main className="main" key={router.pathname}>{children}</main>
        <nav className="tabbar" aria-label="Navigation principale">{navLinks}</nav>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </div>
  );
}
