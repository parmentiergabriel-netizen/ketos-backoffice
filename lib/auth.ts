import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "./firebase";

export const loginGoogle = () => signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
export const logout = () => signOut(getFirebaseAuth());
/** S'abonne aux changements d'utilisateur ; retourne la fonction de désabonnement. */
export const watchUser = (cb: (u: User | null) => void) => onAuthStateChanged(getFirebaseAuth(), cb);

/** Un membre de l'équipe = un document admins/{uid} (créé à la main dans la console Firebase). */
export async function isStaff(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(getDb(), "admins", uid));
  return snap.exists();
}
