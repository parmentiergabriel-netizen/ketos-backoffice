import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined
};

// Initialisation paresseuse : appelée uniquement côté navigateur (dans un useEffect / handler),
// pour que `next build` ne plante pas quand les variables ne sont pas définies au build.
export function getFirebaseApp(): FirebaseApp {
  if (!config.apiKey || !config.projectId) {
    throw new Error("Configuration Firebase manquante : définir les variables NEXT_PUBLIC_FIREBASE_* (voir .env.example).");
  }
  return getApps().length ? getApp() : initializeApp(config);
}

export const getDb = (): Firestore => getFirestore(getFirebaseApp());
export const getFirebaseAuth = (): Auth => getAuth(getFirebaseApp());
