# Déploiement — Vercel et Docker

## Vercel
1. Crée un projet sur Vercel et importe le repo ou le ZIP.
2. Ajoute les variables d'environnement dans Project → Settings → Environment Variables :
   - NEXT_PUBLIC_FIREBASE_API_KEY
   - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   - NEXT_PUBLIC_FIREBASE_PROJECT_ID
   - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   - NEXT_PUBLIC_FIREBASE_APP_ID
   - NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
3. Déploie et vérifie les pages.
4. Déploie `firestore.rules` depuis la CLI Firebase.
5. Fais un smoke test CRUD sur Firestore en production.

## Docker
1. Place `.env.local` à la racine du projet.
2. Lance `docker compose up --build -d`.
3. Accède à http://localhost:3000.
4. Pour les logs : `docker compose logs -f`.
