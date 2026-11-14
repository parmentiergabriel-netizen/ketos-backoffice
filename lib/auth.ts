import { signInAnonymously, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from "firebase/auth";
import { getFirebaseAuth } from "./firebase";

export const loginAnon = () => signInAnonymously(getFirebaseAuth());
export const loginGoogle = () => signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
/** S'abonne aux changements d'utilisateur ; retourne la fonction de désabonnement. */
export const watchUser = (cb: (u: User | null) => void) => onAuthStateChanged(getFirebaseAuth(), cb);
