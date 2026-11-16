import { useRouter } from "next/router";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../components/AuthProvider";
import { confetti } from "../components/ui/fx";
import { Icon } from "../components/ui/Icon";
import { useToast } from "../components/ui/Toasts";
import { createItem, hue, Item, listItems, relativeTime, removeItem, TITLE_MAX } from "../lib/items";

const MILESTONES = new Set([1, 10, 25, 50, 100, 250, 500, 1000]);

function highlight(text: string, needle: string): ReactNode {
  if (!needle) return text;
  const i = text.toLowerCase().indexOf(needle.toLowerCase());
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + needle.length)}</mark>{text.slice(i + needle.length)}</>;
}

export default function Items() {
  const auth = useAuth();
  const router = useRouter();
  const toast = useToast();
  const uid = auth.status === "staff" ? auth.user.uid : null;

  const [title, setTitle] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set()); // suppressions en attente (annulables)
  const [leaving, setLeaving] = useState<Set<string>>(new Set());
  const [fresh, setFresh] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const inputRef = useRef<HTMLInputElement>(null);

  // Rafraîchit les « il y a x min » chaque minute.
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (!uid) return;
    listItems(uid)
      .then(setItems)
      .catch((e: any) => setError(e?.message || "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [uid]);

  // /demo?new=1 (raccourci N, palette, bouton du tableau de bord) : focus direct sur la saisie.
  useEffect(() => {
    if (router.query.new) {
      inputRef.current?.focus();
      router.replace("/demo", undefined, { shallow: true });
    }
  }, [router]);

  const clean = title.trim();
  const tooLong = clean.length > TITLE_MAX;
  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return items.filter(i => !hidden.has(i.id) && (!f || i.title.toLowerCase().includes(f)));
  }, [items, hidden, filter]);
  const total = items.length - hidden.size;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!uid || !clean || tooLong || saving) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createItem(uid, clean);
      setItems(prev => [created, ...prev]);
      setFresh(created.id);
      setTitle("");
      const n = total + 1;
      if (MILESTONES.has(n)) {
        confetti();
        toast({ kind: "success", message: n === 1 ? "Premier élément créé — bienvenue à bord ! 🐋" : `${n} éléments ! Cap franchi 🎉`, duration: 4500 });
      } else {
        toast({ kind: "success", message: "Élément créé" });
      }
    } catch (e: any) {
      toast({ kind: "error", message: e?.message || "Création impossible" });
    } finally {
      setSaving(false);
      inputRef.current?.focus();
    }
  };

  const remove = (it: Item) => {
    setLeaving(s => new Set(s).add(it.id));
    setTimeout(() => {
      setHidden(s => new Set(s).add(it.id));
      setLeaving(s => { const n = new Set(s); n.delete(it.id); return n; });
    }, 320);
    const restore = () => setHidden(s => { const n = new Set(s); n.delete(it.id); return n; });
    toast({
      kind: "info",
      message: `« ${it.title.length > 32 ? it.title.slice(0, 32) + "…" : it.title} » supprimé`,
      duration: 5000,
      action: { label: "Annuler", run: restore },
      onExpire: () => {
        removeItem(it.id)
          .then(() => { setItems(prev => prev.filter(x => x.id !== it.id)); restore(); })
          .catch((e: any) => { restore(); toast({ kind: "error", message: e?.message || "Suppression impossible" }); });
      },
    });
  };

  return (
    <div className="page" style={{ maxWidth: 800 }}>
      <header className="page-head">
        <div>
          <div className="eyebrow">Espace privé</div>
          <h1>Éléments</h1>
          <p>Visibles par toi seul·e. Appuie sur <span className="kbd">N</span> n’importe où pour en créer un.</p>
        </div>
      </header>

      <form className="composer" onSubmit={submit}>
        <label className="field">
          <Icon name="sparkle" style={{ color: "var(--accent)", flex: "none" }} />
          <input ref={inputRef} placeholder="Qu’est-ce qu’on ajoute ?" value={title} aria-label="Titre du nouvel élément"
            onChange={e => setTitle(e.target.value)} disabled={!uid} />
          <button className="btn btn-primary" type="submit" disabled={!uid || !clean || tooLong || saving}>
            {saving ? "…" : <><Icon name="plus" size={16} /> Créer</>}
          </button>
        </label>
        <div className="meta">
          <span>Entrée pour valider</span>
          <span className={tooLong ? "over" : ""}>{clean.length}/{TITLE_MAX}</span>
        </div>
      </form>

      {error && <div className="card panel" style={{ color: "var(--danger)", marginBottom: 16 }}>{error}</div>}

      {(loading || items.length > 0) && (
        <div className="toolbar">
          <label className="field">
            <Icon name="search" size={16} style={{ color: "var(--text-faint)" }} />
            <input placeholder="Filtrer…" value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filtrer les éléments" />
            {filter && <button type="button" className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }} aria-label="Effacer le filtre" onClick={() => setFilter("")}><Icon name="x" size={14} /></button>}
          </label>
          {!loading && <span className="count">{filter ? `${visible.length} / ${total}` : `${total} élément${total > 1 ? "s" : ""}`}</span>}
        </div>
      )}

      {loading ? (
        <ul className="items">
          {[0, 1, 2, 3, 4].map(i => (
            <li key={i} className="item" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 10 }} />
              <div className="body" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="skeleton" style={{ height: 14, width: `${60 - i * 7}%` }} />
                <div className="skeleton" style={{ height: 10, width: 80 }} />
              </div>
            </li>
          ))}
        </ul>
      ) : total === 0 ? (
        <div className="card empty" style={{ padding: "48px 16px" }}>
          <Icon name="inbox" size={40} />
          <b>Aucun élément pour l’instant</b>
          Écris un titre ci-dessus et valide avec Entrée.
        </div>
      ) : visible.length === 0 ? (
        <div className="empty">Aucun élément ne contient « {filter} ».</div>
      ) : (
        <ul className="items">
          {visible.map((it, i) => (
            <li key={it.id} className={`item ${fresh === it.id ? "fresh" : ""} ${leaving.has(it.id) ? "leaving" : ""}`}
              style={{ animationDelay: fresh === it.id ? undefined : `${Math.min(i, 10) * 35}ms` }}>
              <span className="glyph" style={{ background: hue(it.title) }}>{it.title.charAt(0).toUpperCase()}</span>
              <div className="body">
                <div className="title" title={it.title}>{highlight(it.title, filter.trim())}</div>
                <div className="time">{relativeTime(it.createdAt, now)}</div>
              </div>
              <button className="btn btn-ghost btn-icon del" aria-label={`Supprimer « ${it.title} »`} onClick={() => remove(it)}>
                <Icon name="trash" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
