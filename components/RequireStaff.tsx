import { ReactNode, useState } from "react";
import { loginGoogle, logout } from "../lib/auth";
import { useAuth } from "./AuthProvider";
import { GoogleLogo, Icon } from "./ui/Icon";
import { Whale } from "./ui/Logo";

// Bulles déterministes (pas de Math.random : le rendu serveur et client doivent coïncider).
const BUBBLES = Array.from({ length: 18 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 4 + ((i * 7) % 14),
  duration: 9 + ((i * 13) % 12),
  delay: -((i * 5) % 17),
}));

/** Traduit les erreurs de connexion Firebase en messages actionnables (null = rien à afficher). */
function loginErrorMessage(e: any): ReactNode | null {
  switch (e?.code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null;
    case "auth/unauthorized-domain":
      return (
        <>
          Ce domaine n’est pas autorisé pour la connexion Google : <code>{location.hostname}</code>
          <br />À ajouter dans Firebase → Authentication → Paramètres → Domaines autorisés.
        </>
      );
    case "auth/popup-blocked":
      return "La fenêtre de connexion a été bloquée par le navigateur. Autorise les pop-ups pour ce site, puis réessaie.";
    case "auth/network-request-failed":
      return "Connexion réseau impossible. Vérifie ta connexion et réessaie.";
    default:
      return e?.message || "Connexion impossible";
  }
}

/** Décor commun : aurores, grille, bulles qui remontent et vagues. */
function Ocean({ children }: { children: ReactNode }) {
  return (
    <main className="gate">
      <div className="gate-aurora" aria-hidden="true"><span /><span /><span /></div>
      <div className="gate-grid" aria-hidden="true" />
      <div className="bubbles" aria-hidden="true">
        {BUBBLES.map((b, i) => (
          <i key={i} style={{ left: `${b.left}%`, width: b.size, height: b.size, animationDuration: `${b.duration}s`, animationDelay: `${b.delay}s` }} />
        ))}
      </div>
      <svg className="gate-waves" viewBox="0 0 2880 180" preserveAspectRatio="none" aria-hidden="true" style={{ width: "200%" }}>
        <path fill="rgba(59,155,255,0.10)" d="M0 90c240 50 480 50 720 0s480-50 720 0 480 50 720 0 480-50 720 0v90H0z" />
        <path fill="rgba(47,224,200,0.08)" d="M0 120c240-40 480-40 720 0s480 40 720 0 480-40 720 0 480 40 720 0v60H0z" />
      </svg>
      {children}
    </main>
  );
}

/** Affiche `children` seulement pour un membre de l'équipe connecté ; sinon écran de connexion. */
export function RequireStaff({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [error, setError] = useState<ReactNode | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  const login = async () => {
    setError(null);
    setPending(true);
    try {
      await loginGoogle();
    } catch (e: any) {
      setError(loginErrorMessage(e));
    } finally {
      setPending(false);
    }
  };

  const copyUid = async (uid: string) => {
    try {
      await navigator.clipboard.writeText(uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* presse-papiers indisponible : l'UID reste sélectionnable */ }
  };

  if (auth.status === "loading")
    return (
      <Ocean>
        <div className="loader-ring" role="status" aria-label="Chargement">
          <div className="logo-badge" style={{ width: 64, height: 64, borderRadius: 20 }}><Whale size={36} /></div>
        </div>
      </Ocean>
    );

  if (auth.status === "error")
    return (
      <Ocean>
        <div className="gate-card">
          <div className="stagger">
            <div className="logo-badge"><Whale size={44} /></div>
            <h1>Configuration requise</h1>
            <p className="gate-error">{auth.message}</p>
          </div>
        </div>
      </Ocean>
    );

  if (auth.status === "signedOut")
    return (
      <Ocean>
        <div className="gate-card">
          <div className="stagger">
            <div className="logo-badge"><Whale size={44} /></div>
            <h1>Bienvenue sur Ketos</h1>
            <p className="lead">L’espace de pilotage de l’équipe.</p>
            <button className="btn-google" onClick={login} disabled={pending}>
              <GoogleLogo /> {pending ? "Connexion…" : "Continuer avec Google"}
            </button>
            <p className="gate-foot"><Icon name="lock" size={13} /> Accès réservé aux membres de l’équipe</p>
          </div>
          {error && <p className="gate-error" role="alert">{error}</p>}
        </div>
      </Ocean>
    );

  if (auth.status === "forbidden")
    return (
      <Ocean>
        <div className="gate-card">
          <div className="stagger">
            <div className="logo-badge" style={{ background: "linear-gradient(135deg,#ff8a5b,#e5484d)" }}><Icon name="lock" size={34} color="#fff" /></div>
            <h1>Presque à bord</h1>
            <p className="lead">
              Le compte <strong style={{ color: "#fff" }}>{auth.user.email}</strong> n’a pas encore accès.
              Transmets cet identifiant à un administrateur :
            </p>
            <div className="uid-box">
              <code>{auth.user.uid}</code>
              <button onClick={() => copyUid(auth.user.uid)}>{copied ? "Copié ✓" : "Copier"}</button>
            </div>
            <button className="link-light" onClick={() => logout()}>Changer de compte</button>
          </div>
        </div>
      </Ocean>
    );

  return <>{children}</>;
}
