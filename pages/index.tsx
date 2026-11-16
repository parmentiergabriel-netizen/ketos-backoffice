import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../components/AuthProvider";
import { Icon, IconName } from "../components/ui/Icon";
import { Whale } from "../components/ui/Logo";
import { useCountUp } from "../components/ui/fx";
import { countPublic, dailyCounts, hue, Item, listItems, relativeTime, startOfDay } from "../lib/items";

const DAY = 86_400_000;

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 6) return "Belle nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 96},${34 - (v / max) * 30}`).join(" ");
  return (
    <svg className="spark" viewBox="0 0 96 36" aria-hidden="true">
      <defs>
        <linearGradient id="sg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,36 ${pts} 96,36`} fill="url(#sg)" />
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Kpi({ icon, label, value, sub, delta, spark, loading }: {
  icon: IconName; label: string; value: number; sub?: string; delta?: number; spark?: number[]; loading: boolean;
}) {
  const shown = useCountUp(loading ? 0 : value);
  return (
    <div className="card kpi">
      <div className="label"><span className="ico"><Icon name={icon} size={15} /></span>{label}</div>
      {loading ? <div className="skeleton" style={{ height: 40, width: 80, marginTop: 10 }} /> : <div className="value">{shown}</div>}
      <div className="sub">
        {delta !== undefined && !loading && (
          <span className={`delta ${delta > 0 ? "up" : "flat"}`}>{delta > 0 ? `↑ +${delta}` : "="}</span>
        )}{" "}
        {sub}
      </div>
      {spark && !loading && <Spark values={spark} />}
    </div>
  );
}

function ActivityChart({ data, loading }: { data: { day: Date; count: number }[]; loading: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const [grown, setGrown] = useState(false);
  useEffect(() => { if (!loading) { const t = setTimeout(() => setGrown(true), 60); return () => clearTimeout(t); } }, [loading]);

  if (loading) return <div className="skeleton" style={{ height: 300 }} />;

  const W = 700, H = 300, padB = 26, padT = 12;
  const max = Math.max(4, ...data.map(d => d.count));
  const step = W / data.length;
  const bw = Math.min(30, step * 0.6);
  const ticks = [0, Math.round(max / 2), max];

  return (
    <div style={{ position: "relative" }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
        aria-label={`Éléments créés par jour : ${data.map(d => d.count).join(", ")}`}>
        <defs>
          <linearGradient id="bar" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#14c4b0" />
            <stop offset="1" stopColor="#0b7cff" />
          </linearGradient>
        </defs>
        {ticks.map(t => {
          const y = H - padB - (t / max) * (H - padB - padT);
          return <line key={t} x1={0} x2={W} y1={y} y2={y} stroke="var(--border)" strokeDasharray={t ? "4 6" : undefined} />;
        })}
        {data.map((d, i) => {
          const h = grown ? Math.max(d.count ? 4 : 2, (d.count / max) * (H - padB - padT)) : 0;
          const x = i * step + (step - bw) / 2;
          const today = i === data.length - 1;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={i * step} y={0} width={step} height={H} fill="transparent" />
              <rect className="bar" x={x} y={H - padB - h} width={bw} height={h} rx={6}
                fill={d.count ? "url(#bar)" : "var(--border)"} opacity={hover === null || hover === i ? 1 : 0.45}
                style={{ transition: `y 0.9s var(--ease) ${i * 35}ms, height 0.9s var(--ease) ${i * 35}ms, opacity 0.2s` }} />
              {(i % 2 === data.length % 2 || today) && (
                <text x={i * step + step / 2} y={H - 6} textAnchor="middle" fontSize="11" fill={today ? "var(--accent)" : "var(--text-faint)"} fontWeight={today ? 700 : 400}>
                  {today ? "Auj." : d.day.toLocaleDateString("fr-FR", { day: "numeric" })}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${((hover + 0.5) / data.length) * 100}%`, top: `${(1 - data[hover].count / max) * 80 + 4}%` }}>
          <b>{data[hover].count}</b> élément{data[hover].count > 1 ? "s" : ""} · {data[hover].day.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const auth = useAuth();
  const user = auth.status === "staff" ? auth.user : null;
  const [items, setItems] = useState<Item[]>([]);
  const [publicCount, setPublicCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => setNow(new Date()), []);

  useEffect(() => {
    if (!user) return;
    Promise.all([listItems(user.uid), countPublic().catch(() => 0)])
      .then(([its, pub]) => { setItems(its); setPublicCount(pub); })
      .catch((e: any) => setError(e?.message || "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [user]);

  const stats = useMemo(() => {
    const ref = now ?? new Date(0);
    const daily = dailyCounts(items, 14, ref);
    const week = daily.slice(7).reduce((a, d) => a + d.count, 0);
    const prevWeek = daily.slice(0, 7).reduce((a, d) => a + d.count, 0);
    const today = daily[13]?.count ?? 0;
    let streak = 0;
    for (let i = 13; i >= 0 && daily[i].count > 0; i--) streak++;
    const todayStart = startOfDay(ref).getTime();
    const last7 = items.filter(i => (i.createdAt?.getTime() ?? todayStart) >= todayStart - 6 * DAY).length;
    return { daily, week, prevWeek, today, streak, last7 };
  }, [items, now]);

  const firstName = (user?.displayName || user?.email || "").split(/[\s@]/)[0];
  const rawDate = now?.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const dateLabel = rawDate && rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  const pitch = loading
    ? "On remonte les données à la surface…"
    : items.length === 0
      ? "Ton espace est prêt. Crée ton premier élément pour lancer le tableau de bord."
      : stats.streak > 1
        ? `${stats.streak} jours d’activité d’affilée — belle lancée, garde le cap.`
        : stats.week > stats.prevWeek
          ? `Semaine plus active que la précédente : ${stats.week} éléments contre ${stats.prevWeek}.`
          : `${items.length} élément${items.length > 1 ? "s" : ""} au total. Prêt pour la suite ?`;

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-whale"><Whale size={260} color="#fff" /></div>
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 13, opacity: 0.8 }}>{dateLabel ?? " "}</div>
          <h2 style={{ marginTop: 6 }}>{now ? greeting(now) : "Bonjour"}{firstName ? `, ${firstName}` : ""} 👋</h2>
          <p>{pitch}</p>
          <div className="actions">
            <Link href="/demo?new=1" className="btn solid"><Icon name="plus" size={16} /> Nouvel élément</Link>
            <Link href="/demo" className="btn">Voir tout <Icon name="arrow" size={16} /></Link>
          </div>
        </div>
      </section>

      {error && <div className="card panel" style={{ color: "var(--danger)", marginBottom: 20 }}>{error}</div>}

      <section className="kpis">
        <Kpi loading={loading} icon="list" label="Éléments" value={items.length} sub="au total" spark={stats.daily.map(d => d.count)} />
        <Kpi loading={loading} icon="calendar" label="7 derniers jours" value={stats.last7} delta={Math.max(0, stats.week - stats.prevWeek)} sub="vs semaine précédente" />
        <Kpi loading={loading} icon="bolt" label="Série en cours" value={stats.streak} sub={stats.streak > 1 ? "jours d’affilée 🔥" : "jour actif"} />
        <Kpi loading={loading} icon="globe" label="Documents publics" value={publicCount} sub="collection public" />
      </section>

      <section className="grid-2">
        <div className="card panel">
          <div className="panel-head">
            <h3>Activité</h3>
            <span>14 derniers jours</span>
          </div>
          <ActivityChart data={stats.daily} loading={loading} />
        </div>
        <div className="card panel">
          <div className="panel-head">
            <h3>Derniers éléments</h3>
            <Link href="/demo" className="btn btn-ghost" style={{ height: 30, padding: "0 10px", fontSize: 13 }}>Tout voir</Link>
          </div>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[0, 1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 34 }} />)}
            </div>
          ) : items.length === 0 ? (
            <div className="empty">
              <Icon name="inbox" size={32} />
              <b>Rien pour l’instant</b>
              Appuie sur <span className="kbd">N</span> pour créer un élément.
            </div>
          ) : (
            <ul className="feed">
              {items.slice(0, 6).map((it, i) => (
                <li key={it.id} style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="dot" style={{ background: hue(it.title), color: "#fff", fontWeight: 700, fontSize: 13 }}>
                    {it.title.charAt(0).toUpperCase()}
                  </span>
                  <div className="body">
                    <b>{it.title}</b>
                    <small>{now ? relativeTime(it.createdAt, now) : ""}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
