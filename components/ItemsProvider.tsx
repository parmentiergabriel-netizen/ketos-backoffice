import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { Item, watchItems } from "../lib/items";
import { useAuth } from "./AuthProvider";

type ItemsState = { items: Item[]; loading: boolean; error: string | null };

const ItemsContext = createContext<ItemsState>({ items: [], loading: true, error: null });
/** Éléments de l'utilisateur connecté, en temps réel, partagés par toutes les pages. */
export const useItems = () => useContext(ItemsContext);

export function ItemsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const uid = auth.status === "staff" ? auth.user.uid : null;
  const [state, setState] = useState<ItemsState>({ items: [], loading: true, error: null });

  useEffect(() => {
    if (!uid) return;
    setState({ items: [], loading: true, error: null });
    return watchItems(
      uid,
      items => setState({ items, loading: false, error: null }),
      e => setState(s => ({ ...s, loading: false, error: e.message || "Erreur de chargement" })),
    );
  }, [uid]);

  return <ItemsContext.Provider value={state}>{children}</ItemsContext.Provider>;
}
