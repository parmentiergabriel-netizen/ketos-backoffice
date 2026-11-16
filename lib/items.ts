import {
  addDoc, collection, deleteDoc, doc, getCountFromServer, getDocs, query, serverTimestamp, Timestamp, where,
} from "firebase/firestore";
import { getDb } from "./firebase";

// Les éléments privés vivent dans private/demo/items/{id} (cf. firestore.rules).
export const ITEMS_PATH = "private/demo/items";
export const TITLE_MAX = 200;

export type Item = { id: string; title: string; createdAt: Date | null };

export async function listItems(ownerId: string): Promise<Item[]> {
  const q = query(collection(getDb(), ITEMS_PATH), where("ownerId", "==", ownerId));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => {
      const data = d.data();
      const ts = data.createdAt as Timestamp | undefined;
      return { id: d.id, title: String(data.title ?? d.id), createdAt: ts?.toDate?.() ?? null };
    })
    .sort((a, b) => (b.createdAt?.getTime() ?? Infinity) - (a.createdAt?.getTime() ?? Infinity));
}

export async function createItem(ownerId: string, title: string): Promise<Item> {
  const ref = await addDoc(collection(getDb(), ITEMS_PATH), { title, ownerId, createdAt: serverTimestamp() });
  return { id: ref.id, title, createdAt: new Date() };
}

export const removeItem = (id: string) => deleteDoc(doc(getDb(), ITEMS_PATH, id));

export async function countPublic(): Promise<number> {
  const snap = await getCountFromServer(collection(getDb(), "public"));
  return snap.data().count;
}

// ---------- Utilitaires d'affichage ----------
const DAY = 86_400_000;
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** « à l'instant », « il y a 5 min », « hier », « 12 nov. » */
export function relativeTime(date: Date | null, now = new Date()): string {
  if (!date) return "à l'instant";
  const s = Math.round((now.getTime() - date.getTime()) / 1000);
  if (s < 45) return "à l'instant";
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  const days = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / DAY);
  if (days === 0) return `il y a ${Math.round(s / 3600)} h`;
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/** Nombre d'éléments par jour sur les `days` derniers jours (le plus ancien en premier). */
export function dailyCounts(items: Item[], days: number, now = new Date()): { day: Date; count: number }[] {
  const today = startOfDay(now).getTime();
  const buckets = Array.from({ length: days }, (_, i) => ({ day: new Date(today - (days - 1 - i) * DAY), count: 0 }));
  for (const it of items) {
    const t = startOfDay(it.createdAt ?? now).getTime();
    const idx = days - 1 - Math.round((today - t) / DAY);
    if (idx >= 0 && idx < days) buckets[idx].count++;
  }
  return buckets;
}

/** Couleur stable dérivée du titre, pour les pastilles. */
export function hue(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
  return `linear-gradient(135deg, hsl(${h} 80% 55%), hsl(${(h + 40) % 360} 75% 45%))`;
}
