import { FormEvent, useCallback, useEffect, useState } from "react";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { getDb } from "../lib/firebase";
import { loginAnon, loginGoogle, watchUser } from "../lib/auth";

type Row = { id: string; title?: string };

// Les éléments privés vivent dans private/demo/items/{id} (cf. firestore.rules).
const ITEMS_PATH = "private/demo/items";

export default function Demo() {
  const [uid, setUid] = useState<string | null>(null);
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
    let unsubscribe = () => {};
    try {
      unsubscribe = watchUser(async user => {
        setError(null);
        if (!user) {
          setUid(null);
          setRows([]);
          try {
            await loginAnon(); // déclenche un nouvel appel de ce callback
          } catch (e: any) {
            setError(e?.message || "error");
            setLoading(false);
          }
          return;
        }
        setUid(user.uid);
        try {
          await loadRows(user.uid);
        } catch (e: any) {
          setError(e?.message || "error");
        } finally {
          setLoading(false);
        }
      });
    } catch (e: any) {
      setError(e?.message || "error");
      setLoading(false);
    }
    return () => unsubscribe();
  }, [loadRows]);

  const run = (fn: () => Promise<unknown>) => async () => {
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message || "error");
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!uid || !title.trim()) return;
    try {
      await addDoc(collection(getDb(), ITEMS_PATH), { title: title.trim(), ownerId: uid, createdAt: serverTimestamp() });
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
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={run(loginAnon)}>Login anonyme</button>
        <button onClick={run(loginGoogle)}>Login Google</button>
        <span>UID: {uid || "…"}</span>
      </div>
      <form onSubmit={submit} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input placeholder="Titre" value={title} onChange={e => setTitle(e.target.value)} />
        <button type="submit" disabled={!uid || !title.trim()}>Créer</button>
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
