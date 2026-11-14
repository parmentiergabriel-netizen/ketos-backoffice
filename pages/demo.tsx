import { FormEvent, useCallback, useEffect, useState } from "react";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { getDb } from "../lib/firebase";
import { logout } from "../lib/auth";
import { useAuth } from "../components/AuthProvider";

type Row = { id: string; title?: string };

// Les éléments privés vivent dans private/demo/items/{id} (cf. firestore.rules).
const ITEMS_PATH = "private/demo/items";
export const TITLE_MAX = 200;

export default function Demo() {
  const auth = useAuth();
  const uid = auth.status === "staff" ? auth.user.uid : null;
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRows = useCallback(async (ownerId: string) => {
    const q = query(collection(getDb(), ITEMS_PATH), where("ownerId", "==", ownerId));
    const snap = await getDocs(q);
    setRows(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Row, "id">) })));
  }, []);

  useEffect(() => {
    if (!uid) return;
    loadRows(uid)
      .catch((e: any) => setError(e?.message || "error"))
      .finally(() => setLoading(false));
  }, [uid, loadRows]);

  const clean = title.trim();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!uid || !clean || clean.length > TITLE_MAX) return;
    try {
      await addDoc(collection(getDb(), ITEMS_PATH), { title: clean, ownerId: uid, createdAt: serverTimestamp() });
      setTitle("");
      await loadRows(uid);
    } catch (e: any) {
      setError(e?.message || "error");
    }
  };

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto", fontFamily: "ui-sans-serif, system-ui" }}>
      <h1>Demo CRUD privé</h1>
      <p>Projet: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <span>{auth.status === "staff" ? auth.user.email : "…"}</span>
        <button onClick={() => logout()}>Déconnexion</button>
      </div>
      <form onSubmit={submit} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input placeholder="Titre" value={title} maxLength={TITLE_MAX} onChange={e => setTitle(e.target.value)} />
        <button type="submit" disabled={!uid || !clean}>Créer</button>
      </form>
      {loading && <p>Chargement…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && !error && (
        <ul>
          {rows.map(r => (<li key={r.id}>{r.title || r.id}</li>))}
        </ul>
      )}
    </main>
  );
}
