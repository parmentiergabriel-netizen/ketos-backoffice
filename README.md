# ketos-backoffice

Backoffice Next.js + Firebase (Auth Google, Firestore). Accès réservé à l’équipe.

## Démarrer
```bash
npm ci
cp .env.example .env.local   # puis compléter avec la config Firebase
npm run dev
```

## Donner l’accès à quelqu’un
1. La personne se connecte avec Google : l’écran « Accès refusé » affiche son **UID**.
2. Dans la console Firebase → Firestore, crée le document `admins/<UID>` (par ex. champ `role: "admin"`).
3. Elle recharge la page : elle a accès.

La liste `admins` n’est modifiable que depuis la console (les règles interdisent toute écriture depuis l’app).
Pour retirer l’accès, supprime le document.

Activer le fournisseur **Google** dans Firebase → Authentication → Sign-in method, et ajouter le domaine Vercel
dans *Authorized domains*. L’auth anonyme n’est plus utilisée : elle peut être désactivée.

## Qualité
```bash
npm run lint
npm run build
npm test          # tests des règles Firestore dans l’émulateur (Java requis)
```
La CI GitHub (`.github/workflows/ci.yml`) lance tout ça à chaque push et pull request.

## Déploiement
Voir `README_DEPLOY.md`. Après toute modification de `firestore.rules` :
```bash
./deploy_firestore.sh -p ketos-staging
```
