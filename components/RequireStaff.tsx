import { ReactNode, useState } from "react";
import { loginGoogle, logout } from "../lib/auth";
import { useAuth } from "./AuthProvider";

const box: React.CSSProperties = { maxWidth: 420, margin: "15vh auto", padding: 24, fontFamily: "ui-sans-serif, system-ui", textAlign: "center" };

/** Affiche `children` seulement pour un membre de l'équipe connecté ; sinon écran de connexion. */
export function RequireStaff({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);

  const login = async () => {
    setError(null);
    try {
      await loginGoogle();
    } catch (e: any) {
      if (e?.code !== "auth/popup-closed-by-user") setError(e?.message || "Connexion impossible");
    }
  };

  if (auth.status === "loading") return <main style={box}><p>Chargement…</p></main>;
  if (auth.status === "error") return <main style={box}><p style={{ color: "red" }}>{auth.message}</p></main>;
  if (auth.status === "signedOut")
    return (
      <main style={box}>
        <h1>Ketos — Backoffice</h1>
        <p>Accès réservé à l’équipe.</p>
        <button onClick={login}>Se connecter avec Google</button>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </main>
    );
  if (auth.status === "forbidden")
    return (
      <main style={box}>
        <h1>Accès refusé</h1>
        <p>Le compte <strong>{auth.user.email}</strong> n’est pas autorisé.</p>
        <p>Transmets cet identifiant à un administrateur :</p>
        <code style={{ userSelect: "all" }}>{auth.user.uid}</code>
        <p><button onClick={() => logout()}>Changer de compte</button></p>
      </main>
    );
  return <>{children}</>;
}
