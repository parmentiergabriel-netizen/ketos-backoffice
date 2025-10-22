import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

type Doc = { id: string; [key: string]: any };

export default function Home() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const snap = await getDocs(collection(db, "public"));
        const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setDocs(rows);
      } catch (e: any) {
        setError(e?.message || "error");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
      <h1>ketos-backoffice</h1>
      <p>Connected to Firestore project: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}</p>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && !error && (
        <ul>
          {docs.map(d => (
            <li key={d.id}>{d.id}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
