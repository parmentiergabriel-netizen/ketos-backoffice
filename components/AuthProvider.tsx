import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { isStaff, watchUser } from "../lib/auth";

type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "forbidden"; user: User }
  | { status: "staff"; user: User }
  | { status: "error"; message: string };

const AuthContext = createContext<AuthState>({ status: "loading" });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = watchUser(async user => {
        if (!user) return setState({ status: "signedOut" });
        setState({ status: "loading" });
        try {
          setState((await isStaff(user.uid)) ? { status: "staff", user } : { status: "forbidden", user });
        } catch {
          // Les règles refusent la lecture de admins/{uid} si le document n'existe pas pour cet utilisateur.
          setState({ status: "forbidden", user });
        }
      });
    } catch (e: any) {
      setState({ status: "error", message: e?.message || "Erreur d'initialisation" });
    }
    return () => unsubscribe();
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
