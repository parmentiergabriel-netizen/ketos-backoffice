import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { logout } from "../lib/auth";
import { useAuth } from "./AuthProvider";
import { Icon, IconName } from "./ui/Icon";
import { Brand } from "./ui/Logo";
import { currentTheme, setTheme, Theme } from "./ui/theme";

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

function useTheme(): [Theme | null, () => void] {
  const [theme, set] = useState<Theme | null>(null);
  useEffect(() => set(currentTheme()), []);
  const toggle = useCallback(() => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    setTheme(next);
    set(next);
  }, []);
  return [theme, toggle];
}

type Command = { id: string; group: string; label: string; icon: IconName; hint?: string; run: () => void };

function CommandPalette({ open, onClose, commands }: { open: boolean; onClose: () => void; commands: Command[] }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQ(""); setActive(0); setTimeout(() => inputRef.current?.focus(), 0); }
  }, [open]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? commands.filter(c => c.label.toLowerCase().includes(needle)) : commands;
  }, [q, commands]);

  if (!open) return null;

  const run = (c?: Command) => { if (!c) return; onClose(); c.run(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(results.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); run(results[active]); }
    else if (e.key === "Escape") onClose();
  };

  let lastGroup = "";
  return (
    <div className="cmdk-overlay" onMouseDown={onClose}>
      <div className="cmdk" role="dialog" aria-label="Palette de commandes" onMouseDown={e => e.stopPropagation()}>
        <div className="cmdk-input">
          <Icon name="search" />
          <input ref={inputRef} value={q} placeholder="Rechercher une action, une page…" onKeyDown={onKey}
            onChange={e => { setQ(e.target.value); setActive(0); }} />
          <span className="kbd">Échap</span>
        </div>
        <div className="cmdk-list">
          {results.length === 0 && <div className="empty">Aucun résultat pour « {q} »</div>}
          {results.map((c, i) => {
            const header = c.group !== lastGroup ? <div className="cmdk-group">{c.group}</div> : null;
            lastGroup = c.group;
            return (
              <div key={c.id}>
                {header}
                <div className={`cmdk-item ${i === active ? "on" : ""}`} onMouseEnter={() => setActive(i)} onClick={() => run(c)}>
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
  const auth = useAuth();
  const [theme, toggleTheme] = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mac, setMac] = useState(true);

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

  const commands: Command[] = useMemo(() => [
    ...NAV.map(n => ({ id: n.href, group: "Navigation", label: n.label, icon: n.icon, run: () => router.push(n.href) })),
    { id: "new", group: "Actions", label: "Créer un élément", icon: "plus", hint: "N", run: () => router.push("/demo?new=1") },
    { id: "theme", group: "Actions", label: theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre", icon: theme === "dark" ? "sun" : "moon", run: toggleTheme },
    { id: "logout", group: "Compte", label: "Se déconnecter", icon: "logout", run: () => { logout(); } },
  ], [router, theme, toggleTheme]);

  const user = auth.status === "staff" ? auth.user : null;
  const navLinks = NAV.map(n => (
    <Link key={n.href} href={n.href} className={`nav-link ${router.pathname === n.href ? "active" : ""}`}>
      <Icon name={n.icon} /> {n.label}
    </Link>
  ));

  return (
    <div className="shell">
      <aside className="sidebar">
        <Brand />
        <button className="search-trigger" onClick={() => setPaletteOpen(true)}>
          <Icon name="search" size={16} /> Rechercher
          <span className="kbd">{mac ? "⌘" : "Ctrl"} K</span>
        </button>
        <div className="nav-label">Espace</div>
        {navLinks}
        <div className="sidebar-foot">
          <button className="btn btn-ghost" style={{ justifyContent: "flex-start" }} onClick={toggleTheme}>
            <Icon name={theme === "dark" ? "sun" : "moon"} /> {theme === "dark" ? "Thème clair" : "Thème sombre"}
          </button>
          <div className="user-chip">
            <Avatar />
            <div className="who">
              <b>{user?.displayName || "Membre de l’équipe"}</b>
              <span>{user?.email}</span>
            </div>
            <button className="btn btn-ghost btn-icon" title="Se déconnecter" aria-label="Se déconnecter" onClick={() => logout()}>
              <Icon name="logout" size={17} />
            </button>
          </div>
        </div>
      </aside>

      <div>
        <header className="topbar-mobile">
          <Brand />
          <span className="spacer" />
          <button className="btn btn-ghost btn-icon" aria-label="Rechercher" onClick={() => setPaletteOpen(true)}><Icon name="search" /></button>
          <button className="btn btn-ghost btn-icon" aria-label="Changer de thème" onClick={toggleTheme}><Icon name={theme === "dark" ? "sun" : "moon"} /></button>
          <Avatar />
        </header>
        <main className="main" key={router.pathname}>{children}</main>
        <nav className="tabbar">{navLinks}</nav>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </div>
  );
}
