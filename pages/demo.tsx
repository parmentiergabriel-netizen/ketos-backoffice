import { FormEvent, useEffect, useState } from "react";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { auth, loginAnon, loginGoogle, waitUser } from "../lib/auth";

type Row = { id: string; title?: string };

export default function Demo() {
  const [uid, setUid] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const u: any = await waitUser();
        if (!u) {
          await loginAnon();
        }
        const user: any = await waitUser();
        setUid(user?.uid || null);
        if (user?.uid) {
          const q = query(collection(db, "private/demo"), where("ownerId", "==", user.uid));
          const snap = await getDocs(q);
          setRows(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        }
      } catch (e: any) {
        setError(e?.message || "error");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!uid) return;
    try {
      await addDoc(collection(db, "private/demo"), { title, ownerId: uid, createdAt: serverTimestamp() });
      setTitle("");
      const q = query(collection(db, "private/demo"), where("ownerId", "==", uid));
      const snap = await getDocs(q);
      setRows(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
    } catch (e: any) {
      setError(e?.message || "error");
    }
  };

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: "0 auto", fontFamily: "ui-sans-serif, system-ui" }}>
      <h1>Demo CRUD privé</h1>
      <p>Projet: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => loginAnon()}>Login anonyme</button>
        <button onClick={() => loginGoogle()}>Login Google</button>
        <span>UID: {uid || "…"}</span>
      </div>
      <form onSubmit={submit} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input placeholder="Titre" value={title} onChange={e => setTitle(e.target.value)} />
        <button type="submit" disabled={!uid || !title}>Créer</button>
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
