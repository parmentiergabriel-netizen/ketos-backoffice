import {
  collection, deleteDoc, doc, onSnapshot, query, QueryDocumentSnapshot,
  serverTimestamp, setDoc, Timestamp, updateDoc, where,
} from "firebase/firestore";
import { getDb } from "./firebase";

// Les éléments privés vivent dans private/demo/items/{id} (cf. firestore.rules).
export const ITEMS_PATH = "private/demo/items";
export const TITLE_MAX = 200;

export type Item = { id: string; title: string; createdAt: Date | null };

const ownedBy = (ownerId: string) => query(collection(getDb(), ITEMS_PATH), where("ownerId", "==", ownerId));

function toItems(docs: QueryDocumentSnapshot[]): Item[] {
  return docs
    .map(d => {
      // estimate : un createdAt encore en attente (écriture locale) prend l'heure locale au lieu de null.
      const data = d.data({ serverTimestamps: "estimate" });
      const ts = data.createdAt as Timestamp | undefined;
      return { id: d.id, title: String(data.title ?? d.id), createdAt: ts?.toDate?.() ?? null };
    })
    .sort((a, b) => (b.createdAt?.getTime() ?? Infinity) - (a.createdAt?.getTime() ?? Infinity));
}

/** Abonnement temps réel aux éléments de `ownerId` ; retourne la fonction de désabonnement. */
export function watchItems(ownerId: string, onData: (items: Item[]) => void, onError: (e: Error) => void) {
  return onSnapshot(ownedBy(ownerId), snap => onData(toItems(snap.docs)), onError);
}

export const renameItem = (id: string, title: string) => updateDoc(doc(getDb(), ITEMS_PATH, id), { title });

/** Identifiant généré côté client : l'UI connaît l'élément avant même la réponse du serveur. */
export const newItemId = () => doc(collection(getDb(), ITEMS_PATH)).id;

export const createItem = (id: string, ownerId: string, title: string) =>
  setDoc(doc(getDb(), ITEMS_PATH, id), { title, ownerId, createdAt: serverTimestamp() });

export const removeItem = (id: string) => deleteDoc(doc(getDb(), ITEMS_PATH, id));

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
